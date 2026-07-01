'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { ArrowLeft, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from 'lucide-react';

type CheckState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [checkState, setCheckState] = useState<CheckState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi.verifyResetToken(token)
      .then(() => setCheckState('valid'))
      .catch(() => setCheckState('invalid'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-parchment/40 hover:text-parchment text-sm font-sans transition-colors mb-8">
          <ArrowLeft size={14} />
          Back to login
        </Link>

        {checkState === 'checking' && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-parchment/40 font-sans text-sm">Checking your link...</p>
          </div>
        )}

        {checkState === 'invalid' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle size={26} className="text-red-400" />
            </div>
            <h1 className="font-display text-2xl text-parchment mb-3">Link expired or invalid</h1>
            <p className="text-parchment/40 font-sans text-sm leading-relaxed mb-8">
              This password reset link is no longer valid. Reset links expire after 1 hour
              and can only be used once.
            </p>
            <Link href="/auth/forgot-password" className="btn-primary w-full justify-center py-3.5 inline-flex">
              Request a new link
            </Link>
          </div>
        )}

        {checkState === 'valid' && !done && (
          <>
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
                <KeyRound size={24} className="text-gold" />
              </div>
              <h1 className="font-display text-3xl text-parchment mb-2">Set a new password</h1>
              <p className="text-parchment/40 font-sans text-sm">Choose something you haven't used before.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm font-sans">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-2">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-11"
                    placeholder="At least 8 characters"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/30 hover:text-parchment/60 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-2">
                  Confirm new password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Re-enter your new password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full justify-center py-3.5" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        )}

        {done && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={26} className="text-emerald-400" />
            </div>
            <h1 className="font-display text-2xl text-parchment mb-3">Password reset!</h1>
            <p className="text-parchment/40 font-sans text-sm leading-relaxed">
              Redirecting you to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
