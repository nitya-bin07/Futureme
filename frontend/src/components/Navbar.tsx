'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { LayoutDashboard, PenLine, Shield, LogOut, Menu, X, Feather, BarChart2, User, Coins } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const credits = user?.letter_credits ?? 0;

  const navLinks = user ? [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/compose', label: 'Write', icon: PenLine },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ] : [];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="navbar">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold/60 transition-all duration-300">
              <Feather size={14} className="text-gold" />
            </div>
            <span className="font-display text-xl tracking-wide text-parchment group-hover:text-gradient transition-all duration-300">
              FutureMe
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-all duration-200 ${
                  isActive(href) ? 'bg-gold/10 text-gold border border-gold/20' : 'text-parchment/60 hover:text-parchment hover:bg-white/5'
                }`}>
                <Icon size={15} />{label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/pricing"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-sans transition-all duration-200 hover:scale-105
                    ${credits === 0
                      ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/40'
                      : credits <= 2
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/40'
                      : 'bg-gold/8 border-gold/20 text-gold hover:border-gold/40'
                    }`}>
                  <Coins size={11} />
                  <span className="font-semibold">{credits}</span>
                  <span className="text-current/60">{credits === 1 ? 'credit' : 'credits'}</span>
                  {credits === 0 && <span className="ml-0.5">Buy</span>}
                </Link>

                <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm text-parchment font-sans leading-none">{user.name}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center">
                    <span className="text-gold text-xs font-bold">{user.name[0].toUpperCase()}</span>
                  </div>
                </Link>

                <button onClick={logout} className="btn-ghost text-red-400/50 hover:text-red-400 px-2 py-2">
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/pricing" className="text-parchment/60 hover:text-parchment text-sm font-sans transition-colors">Pricing</Link>
                <Link href="/auth/login" className="btn-ghost">Sign In</Link>
                <Link href="/auth/register" className="btn-primary text-xs px-5 py-2.5">Get Started Free</Link>
              </div>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden btn-ghost p-2">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[#2a2a3e] space-y-1 fade-in">
            {user && (
              <div className="px-4 py-3 mb-2">
                <Link href="/pricing" onClick={() => setMobileOpen(false)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-sans
                    ${credits === 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      credits <= 2 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-gold/8 border-gold/20 text-gold'}`}>
                  <Coins size={13} />
                  {credits} letter {credits === 1 ? 'credit' : 'credits'} remaining
                  {credits === 0 && ' Buy more'}
                </Link>
              </div>
            )}
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans transition-all ${
                  isActive(href) ? 'bg-gold/10 text-gold' : 'text-parchment/60 hover:text-parchment hover:bg-white/5'
                }`}>
                <Icon size={16} />{label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-parchment/60 hover:text-parchment font-sans">
                  <User size={16} />Profile
                </Link>
                <button onClick={() => { logout(); setMobileOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400/70 hover:text-red-400 w-full font-sans">
                  <LogOut size={16} />Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2 px-4">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="btn-secondary justify-center">Sign In</Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="btn-primary justify-center">Get Started Free</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
