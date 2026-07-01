'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { creditsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Feather, Check, Zap, Star, Package, ArrowRight, Shield, Clock, Coins, History } from 'lucide-react';

const ICONS: Record<string, any> = {
  pkg_1: Feather,
  pkg_5: Zap,
  pkg_12: Package,
  pkg_30: Star,
};

const STYLES: Record<string, any> = {
  pkg_1:  { border: 'border-[#2a2a3e]',         text: 'text-parchment/50',  glow: '' },
  pkg_5:  { border: 'border-blue-500/30',        text: 'text-blue-400',      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.06)]' },
  pkg_12: { border: 'border-gold/30',            text: 'text-gold',          glow: 'shadow-[0_0_40px_rgba(201,169,110,0.09)]' },
  pkg_30: { border: 'border-emerald-500/30',     text: 'text-emerald-400',   glow: 'shadow-[0_0_30px_rgba(16,185,129,0.06)]' },
};

const FAQ = [
  { q: 'Do credits expire?', a: 'Never. Credits stay in your account forever and can be used whenever you want.' },
  { q: 'What counts as one letter?', a: 'One letter equals one message scheduled for future delivery. There is no word count limit.' },
  { q: 'Is my first letter really free?', a: 'Yes. Every new account gets 1 free credit on signup with no credit card required.' },
  { q: 'How do payments work?', a: 'Clicking Buy takes you to Stripe Checkout, a secure page hosted by Stripe — we never see or store your card details. One-time payments only, no subscriptions ever.' },
  { q: 'Can I send the same letter to multiple people?', a: 'Each delivery uses one credit. Sending the same message to 3 people costs 3 credits.' },
  { q: 'Can I get a refund?', a: 'If a letter fails to deliver and we cannot retry successfully, the credit is returned to your account automatically.' },
];

function PricingPageInner() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const checkoutResult = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');

    if (checkoutResult === 'success' && sessionId && user) {
      let attempts = 0;
      const poll = async () => {
        attempts++;
        try {
          const r = await creditsApi.checkoutStatus(sessionId);
          if (r.data.status === 'completed') {
            setSuccess(`${r.data.credits} credit${r.data.credits > 1 ? 's' : ''} added to your account!`);
            await refreshUser();
            load();
            return;
          }
        } catch (e) {}
        if (attempts < 6) setTimeout(poll, 1500);
        else setSuccess("Payment received! Your credits will appear shortly.");
      };
      poll();
      router.replace('/pricing');
    } else if (checkoutResult === 'cancelled') {
      setErr('Checkout was cancelled. No charge was made.');
      router.replace('/pricing');
    }
  }, [searchParams, user]);

  async function load() {
    try {
      const r = await creditsApi.packages();
      setPackages(r.data.packages);
      if (user) {
        try {
          const t = await creditsApi.transactions();
          setTransactions(t.data.transactions.slice(0, 8));
        } catch(e) {}
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(pkg: any) {
    if (!user) { window.location.href = '/auth/register'; return; }
    setBuying(pkg.id);
    setErr('');
    setSuccess('');
    try {
      const r = await creditsApi.checkout(pkg.id);
      window.location.href = r.data.checkout_url;
    } catch(e: any) {
      setErr(e?.response?.data?.error || 'Could not start checkout. Please try again.');
      setBuying(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">

        <div className="text-center py-14 px-6">
          <div className="inline-flex items-center gap-2 bg-gold/8 border border-gold/20 rounded-full px-4 py-1.5 text-gold text-xs font-sans uppercase tracking-wider mb-5">
            <Coins size={12} />
            Pay per letter. No subscriptions. Credits never expire.
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-parchment mt-2 mb-4 font-light">Simple, honest pricing.</h1>
          <div className="gold-divider mt-2 mb-5" />
          <p className="text-parchment/40 font-sans max-w-xl mx-auto text-base leading-relaxed">
            Every new account gets <strong className="text-parchment">1 free letter</strong>. Buy more only when you need them.
          </p>
        </div>

        {user && (
          <div className="flex justify-center mb-10">
            <div className={`flex items-center gap-3 rounded-2xl border px-6 py-3.5
              ${(user.letter_credits || 0) === 0 ? 'bg-red-500/5 border-red-500/20' : (user.letter_credits || 0) <= 2 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#16161f] border-[#2a2a3e]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border
                ${(user.letter_credits || 0) === 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : (user.letter_credits || 0) <= 2 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-gold/10 text-gold border-gold/20'}`}>
                {user.letter_credits || 0}
              </div>
              <div>
                <p className="text-parchment text-sm font-sans font-medium">
                  {(user.letter_credits || 0) === 0 ? 'No credits remaining' : (user.letter_credits || 0) === 1 ? '1 letter credit remaining' : `${user.letter_credits} letter credits remaining`}
                </p>
                <p className="text-parchment/30 text-xs font-sans">Credits never expire</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="max-w-lg mx-auto mb-6 px-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm font-sans text-center">{success}</div>
          </div>
        )}
        {err && (
          <div className="max-w-lg mx-auto mb-6 px-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm font-sans text-center">{err}</div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
              {packages.map((pkg) => {
                const st = STYLES[pkg.id] || STYLES.pkg_1;
                const Icon = ICONS[pkg.id] || Feather;
                const isBuying = buying === pkg.id;
                const priceNum = Number(pkg.price);
                const perLetter = (priceNum / pkg.credits).toFixed(2);
                const isHighlight = pkg.id === 'pkg_12';

                return (
                  <div key={pkg.id} className={`relative flex flex-col rounded-2xl border p-6 bg-[#16161f] transition-all duration-300 hover:-translate-y-1 ${st.border} ${st.glow}`}>
                    {pkg.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-sans font-semibold border bg-[#0d0d14] ${st.border} ${st.text}`}>{pkg.badge}</span>
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${st.border}`}>
                      <Icon size={18} className={st.text} />
                    </div>
                    <h3 className="font-display text-xl text-parchment mb-1">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-parchment/40 text-sm font-sans">$</span>
                      <span className="font-display text-3xl text-parchment">{priceNum.toFixed(2)}</span>
                    </div>
                    <p className={`text-xs font-sans mb-1 ${st.text}`}>{pkg.credits} letter{pkg.credits > 1 ? 's' : ''}</p>
                    <p className="text-parchment/25 text-xs font-sans mb-5">${perLetter} per letter</p>
                    <ul className="space-y-2 flex-1 mb-6">
                      {[
                        'Credits never expire',
                        'AES-256 encryption',
                        'Email delivery',
                        ...(pkg.credits >= 5 ? ['Collaboration invites'] : []),
                        ...(pkg.credits >= 12 ? ['Analytics dashboard'] : []),
                        ...(pkg.credits >= 30 ? ['Priority support'] : []),
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <Check size={11} className="text-emerald-400 flex-shrink-0" />
                          <span className="text-parchment/50 text-xs font-sans">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleBuy(pkg)}
                      disabled={isBuying}
                      className={`w-full py-3 rounded-xl text-sm font-sans font-medium transition-all duration-200 flex items-center justify-center gap-2 border
                        ${isBuying ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                        ${isHighlight ? 'btn-primary border-transparent' : `${st.border} ${st.text} hover:bg-white/5`}`}
                    >
                      {isBuying ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>{user ? 'Buy Now' : 'Sign Up to Buy'} <ArrowRight size={13} /></>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card p-6 mb-12 flex flex-col sm:flex-row items-center gap-5 border-emerald-500/15 bg-emerald-500/3">
            <div className="text-4xl">🎁</div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-display text-xl text-parchment mb-1">Start completely free</h3>
              <p className="text-parchment/40 font-sans text-sm">Create an account and get 1 free letter credit instantly. No credit card. No trial period.</p>
            </div>
            <Link href={user ? '/compose' : '/auth/register'} className="btn-primary flex-shrink-0">
              <Feather size={14} />
              {user ? 'Write a Letter' : 'Get Started Free'}
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="font-display text-3xl text-parchment text-center mb-8 font-light">How it works</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: '🎁', step: '01', title: 'Get your free letter', desc: 'Sign up and receive 1 free credit instantly. Write your first letter to your future self at zero cost.' },
                { icon: '✍️', step: '02', title: 'Write and schedule', desc: 'Compose your letter. Set a delivery date 6 months, 5 years, or 30 years from now. One credit per letter.' },
                { icon: '📬', step: '03', title: 'Buy more when ready', desc: 'Need to write more? Purchase a package. Credits stack up and never expire. Buy once, use forever.' },
              ].map(item => (
                <div key={item.step} className="card p-6 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="text-xs text-parchment/20 font-sans mb-2 tracking-widest">{item.step}</div>
                  <h3 className="font-sans font-semibold text-parchment mb-2 text-sm">{item.title}</h3>
                  <p className="text-parchment/40 font-sans text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mb-12 py-6 border-y border-[#2a2a3e]">
            {[
              { icon: Shield, text: 'AES-256-GCM Encrypted' },
              { icon: Clock, text: 'Credits Never Expire' },
              { icon: Coins, text: 'No Subscriptions' },
              { icon: Check, text: 'No Hidden Fees' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-parchment/40 text-sm font-sans">
                <item.icon size={14} className="text-gold/60" />
                {item.text}
              </div>
            ))}
          </div>

          {user && transactions.length > 0 && (
            <div className="mb-12">
              <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-parchment/50 hover:text-parchment font-sans text-sm mb-4 transition-colors">
                <History size={14} />
                {showHistory ? 'Hide' : 'Show'} credit history
              </button>
              {showHistory && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#2a2a3e]">
                    <h3 className="text-xs text-parchment/40 font-sans uppercase tracking-wider">Recent Transactions</h3>
                  </div>
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3e] last:border-0">
                      <div>
                        <p className="text-parchment text-sm font-sans">{tx.description}</p>
                        <p className="text-parchment/30 text-xs font-sans mt-0.5">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span className={`text-sm font-sans font-semibold ${tx.credits > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.credits > 0 ? '+' : ''}{tx.credits}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            <h2 className="font-display text-3xl text-parchment text-center mb-8 font-light">FAQ</h2>
            <div className="space-y-3">
              {FAQ.map(item => (
                <div key={item.q} className="card p-5">
                  <h3 className="font-sans font-semibold text-parchment mb-2 text-sm">{item.q}</h3>
                  <p className="text-parchment/45 font-sans text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PricingPageLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
      </main>
      <Footer />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageLoading />}>
      <PricingPageInner />
    </Suspense>
  );
}
