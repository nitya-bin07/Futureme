import Link from 'next/link';
import { Feather, Github, Twitter, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[#2a2a3e] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center">
                <Feather size={14} className="text-gold" />
              </div>
              <span className="font-display text-xl text-parchment">FutureMe</span>
            </div>
            <p className="text-parchment/40 text-sm font-sans leading-relaxed max-w-xs">
              Seal your words in time. Write to the person you'll become — and let the future deliver them back.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <div className="gold-divider" style={{ margin: '0', width: '40px' }} />
              <span className="text-xs text-parchment/30 font-sans tracking-widest uppercase">Since 2025</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold/60 mb-4 font-sans">Navigate</h4>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/compose', label: 'Write a Letter' },
                { href: '/dashboard', label: 'My Letters' },
                { href: '/auth/register', label: 'Get Started' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-parchment/40 hover:text-gold text-sm font-sans transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold/60 mb-4 font-sans">Legal</h4>
            <ul className="space-y-2">
              {[
                { href: '#', label: 'Privacy Policy' },
                { href: '#', label: 'Terms of Service' },
                { href: '#', label: 'GDPR' },
                { href: '#', label: 'Security' },
              ].map(({ href, label }) => (
                <li key={label}>
                  <a href={href} className="text-parchment/40 hover:text-gold text-sm font-sans transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2a2a3e] mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-parchment/30 text-xs font-sans flex items-center gap-1.5">
            Crafted with <Heart size={11} className="text-gold/60" /> — Letters delivered across time
          </p>
          <p className="text-parchment/20 text-xs font-sans">
            © {new Date().getFullYear()} FutureMe. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
