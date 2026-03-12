'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Feather, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const s = strength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][s];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'][s];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.email.trim()) { setError('Please enter your email'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-parchment/40 hover:text-parchment text-sm font-sans mb-8 transition-colors">
          Back to home
        </Link>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center">
            <Feather size={16} className="text-gold" />
          </div>
          <span className="font-display text-xl text-parchment">FutureMe</span>
        </div>

        <h1 className="font-display text-4xl text-parchment mb-2 font-light">Create your account</h1>
        <p className="text-parchment/40 font-sans text-sm mb-8">Your first letter is free. No credit card needed.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field pr-11"
                placeholder="At least 8 characters"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/30 hover:text-parchment/60 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < s ? strengthColor : 'bg-[#2a2a3e]'}`} />
                  ))}
                </div>
                <span className={`text-xs font-sans ${['', 'text-red-400', 'text-yellow-400', 'text-blue-400', 'text-emerald-400'][s]}`}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Confirm Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="input-field"
              placeholder="Repeat your password"
              required
            />
            {form.confirm && form.password !== form.confirm && (
              <p className="text-red-400 text-xs mt-1.5 font-sans">Passwords do not match</p>
            )}
            {form.confirm && form.password === form.confirm && form.confirm.length > 0 && (
              <p className="text-emerald-400 text-xs mt-1.5 font-sans">Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3.5 text-base mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <><UserPlus size={16} /> Create Free Account</>
            )}
          </button>
        </form>

        <p className="text-center text-parchment/25 text-xs font-sans mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="text-center text-parchment/50 font-sans text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gold hover:text-gold/80 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
