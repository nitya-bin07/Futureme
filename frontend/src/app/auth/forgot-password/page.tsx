'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Feather, ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      // Backend always returns a generic success message, whether or not
      // the email exists — that's intentional so we don't leak which
      // addresses have accounts.
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #0d0d14 0%, #13131e 100%)' }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(201,169,110,0.06) 0%, transparent 60%)'
        }} />

        <div className="relative text-center">
          <div className="font-display text-[120px] text-gold/5 leading-none select-none mb-8">🔑</div>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
              <KeyRound size={28} className="text-gold" />
            </div>
            <h2 className="font-display text-4xl text-parchment mb-4 font-light">FutureMe</h2>
            <div className="gold-divider mb-6" />
            <p className="text-parchment/40 font-sans text-center max-w-xs leading-relaxed text-sm">
              No worries — it happens. We'll send you a link to get back into your account.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-parchment/40 hover:text-parchment text-sm font-sans transition-colors mb-8">
            <ArrowLeft size={14} />
            Back to login
          </Link>

          {!sent ? (
            <>
              <div className="mb-8">
                <h1 className="font-display text-3xl text-parchment mb-2">Forgot your password?</h1>
                <p className="text-parchment/40 font-sans text-sm">
                  Enter the email on your account and we'll send you a link to reset it.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm font-sans">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-3.5" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail size={16} />
                      Send Reset Link
                    </span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <h1 className="font-display text-2xl text-parchment mb-3">Check your email</h1>
              <p className="text-parchment/40 font-sans text-sm leading-relaxed mb-2">
                If an account exists for <strong className="text-parchment/70">{email}</strong>,
                a password reset link is on its way.
              </p>
              <p className="text-parchment/30 font-sans text-xs leading-relaxed mb-8">
                The link expires in 1 hour. Didn't get it? Check your spam folder, or try again below.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="btn-secondary w-full justify-center py-3"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[#2a2a3e] text-center">
            <p className="text-parchment/40 text-sm font-sans">
              Remembered it?{' '}
              <Link href="/auth/login" className="text-gold hover:text-gold-light transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
