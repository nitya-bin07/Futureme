'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Feather, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
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
        
        {/* Big decorative text */}
        <div className="relative text-center">
          <div className="font-display text-[120px] text-gold/5 leading-none select-none mb-8">✉</div>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
              <Feather size={28} className="text-gold" />
            </div>
            <h2 className="font-display text-4xl text-parchment mb-4 font-light">FutureMe</h2>
            <div className="gold-divider mb-6" />
            <p className="text-parchment/40 font-sans text-center max-w-xs leading-relaxed text-sm">
              Your letters are waiting — encrypted, preserved, and ready to be delivered exactly when you choose.
            </p>
          </div>
        </div>

        {/* Floating letters preview */}
        <div className="absolute bottom-16 left-8 right-8 space-y-3">
          {[
            { title: 'Dear Future Me, at 30...', date: '3 years away', status: 'badge-scheduled' },
            { title: 'To myself after graduation...', date: 'Delivered', status: 'badge-delivered' },
          ].map(({ title, date, status }, i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-parchment/70 text-xs font-sans">{title}</p>
                <p className="text-parchment/30 text-xs font-sans mt-0.5">{date}</p>
              </div>
              <span className={status}>{date === 'Delivered' ? '✓ Delivered' : '⏳ Waiting'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-parchment/40 hover:text-parchment text-sm font-sans transition-colors mb-8">
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-parchment mb-2">Welcome back</h1>
            <p className="text-parchment/40 font-sans text-sm">Your letters are waiting for you</p>
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
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-11"
                  placeholder="Your password"
                  required
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

            <button type="submit" className="btn-primary w-full justify-center py-3.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Sign In
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#2a2a3e] text-center">
            <p className="text-parchment/40 text-sm font-sans">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-gold hover:text-gold-light transition-colors font-medium">
                Create one free
              </Link>
            </p>
          </div>

          {/* Demo creds */}
          <div className="mt-4 bg-gold/5 border border-gold/10 rounded-xl p-4">
            <p className="text-gold/60 text-xs font-sans font-medium mb-2 tracking-wider uppercase">Quick demo login</p>
            <div className="space-y-1">
              <p className="text-parchment/40 text-xs font-mono">Admin: admin@futureme.local / Admin@123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
