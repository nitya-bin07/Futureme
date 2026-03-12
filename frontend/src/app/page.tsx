'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Feather, Clock, Lock, Mail, Star, ArrowRight, ChevronDown, Shield, Zap, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const TESTIMONIALS = [
  {
    text: "I wrote to myself at 25 about my fears and dreams. At 30, reading it made me cry with pride. I had no idea how far I'd come.",
    author: "Priya M.",
    location: "Mumbai",
    year: "5 years later"
  },
  {
    text: "My therapist suggested this. Writing to my future self gave me clarity I couldn't find in journaling. It felt like sending hope forward.",
    author: "James K.",
    location: "London",
    year: "2 years later"
  },
  {
    text: "I wrote three letters. One for when I graduate, one for my 40th birthday, one for when I'm 65. Knowing they're waiting changes how I live.",
    author: "Sarah L.",
    location: "Toronto",
    year: "Scheduled"
  },
];

const FEATURES = [
  {
    icon: Lock,
    title: "Military-grade Encryption",
    desc: "Your words are encrypted with AES-256-GCM before being stored. Not even we can read your letters.",
    accent: "bg-blue-500/10 border-blue-500/20 text-blue-400"
  },
  {
    icon: Clock,
    title: "Precision Delivery",
    desc: "Set any delivery date from 1 day to decades away. Your letter arrives exactly when you intend.",
    accent: "bg-gold/10 border-gold/20 text-gold"
  },
  {
    icon: Mail,
    title: "Emotional Intelligence",
    desc: "Tag your letters by mood and emotion. Track your emotional journey across years.",
    accent: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  },
  {
    icon: Shield,
    title: "Letter Locking",
    desc: "Seal a letter and make it permanent. No second thoughts — just honesty frozen in time.",
    accent: "bg-purple-500/10 border-purple-500/20 text-purple-400"
  },
  {
    icon: Heart,
    title: "Send to Anyone",
    desc: "Write to your future self, a loved one, or someone who'll read it when the time is right.",
    accent: "bg-rose-500/10 border-rose-500/20 text-rose-400"
  },
  {
    icon: Zap,
    title: "Always Available",
    desc: "Your letters are backed up and monitored 24/7. Delivery never fails — we retry automatically.",
    accent: "bg-amber-500/10 border-amber-500/20 text-amber-400"
  },
];

const MOODS = [
  { emoji: '💭', label: 'Reflective' },
  { emoji: '🌱', label: 'Hopeful' },
  { emoji: '💪', label: 'Determined' },
  { emoji: '❤️', label: 'Loving' },
  { emoji: '😔', label: 'Struggling' },
  { emoji: '🎯', label: 'Focused' },
  { emoji: '✨', label: 'Inspired' },
  { emoji: '🙏', label: 'Grateful' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(201,169,110,0.06) 0%, transparent 65%)' }} />
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(100,80,200,0.05) 0%, transparent 70%)' }} />
          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-gold/20"
              style={{
                top: `${15 + i * 10}%`,
                left: `${8 + i * 11}%`,
                animation: `float ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`
              }}
            />
          ))}
          {/* Envelope illustration top right */}
          <div className="absolute top-24 right-12 opacity-10 hidden lg:block"
            style={{ animation: 'float 7s ease-in-out infinite', fontSize: '120px' }}>
            ✉
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Label */}
            <div className="inline-flex items-center gap-2.5 mb-8 fade-in">
              <div className="gold-divider" style={{ width: '32px', margin: 0 }} />
              <span className="section-label">A letter. A lifetime. A revelation.</span>
              <div className="gold-divider" style={{ width: '32px', margin: 0 }} />
            </div>

            {/* Main heading */}
            <h1 className="heading-display text-parchment mb-6 fade-up" style={{ lineHeight: 1.1 }}>
              Write to the person
              <br />
              <span className="text-gradient">you'll become.</span>
            </h1>

            {/* Sub */}
            <p className="text-parchment/50 text-xl font-body leading-relaxed max-w-2xl mx-auto mb-10 fade-up-delay-1">
              Seal your words today. Receive them tomorrow, next year, or a decade from now. 
              FutureMe delivers letters across time — encrypted, preserved, and perfectly timed.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up-delay-2">
              <Link href={user ? '/compose' : '/auth/register'} className="btn-primary text-base px-8 py-4 group">
                <Feather size={18} />
                {user ? 'Write a Letter' : 'Start Writing — Free'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#how-it-works" className="btn-secondary text-base px-8 py-4">
                See How It Works
                <ChevronDown size={16} />
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 mt-12 fade-up-delay-3">
              <div className="flex -space-x-2">
                {['A', 'J', 'S', 'M', 'R'].map((l, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-void-700 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-xs text-gold font-bold">
                    {l}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-gold fill-gold" />)}
                </div>
                <p className="text-parchment/40 text-xs font-sans">12,000+ letters sealed</p>
              </div>
            </div>
          </div>

          {/* Letter preview card */}
          <div className="mt-16 max-w-2xl mx-auto fade-up-delay-4">
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/20 via-gold/5 to-transparent" />
              <div className="relative card p-8 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="section-label mb-1">Dear Future Me</p>
                    <h3 className="font-display text-xl text-parchment">On the day I turn 30</h3>
                  </div>
                  <div className="text-right">
                    <span className="badge-scheduled">Scheduled</span>
                    <p className="text-xs text-parchment/30 mt-1.5 font-sans">Dec 15, 2028</p>
                  </div>
                </div>
                <div className="border-t border-[#2a2a3e] pt-5">
                  <p className="letter-content text-base" style={{ color: '#888' }}>
                    "I hope by now you've found the courage you were always looking for. 
                    I hope the fear that lives in your chest today has quieted, or at least 
                    learned to be your companion rather than your captor..."
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#2a2a3e]">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="text-xs text-parchment/30 font-sans">AES-256-GCM encrypted • Delivery scheduled • Letter locked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 border-t border-[#2a2a3e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="section-label">Simple. Profound. Permanent.</span>
            <h2 className="font-display text-4xl md:text-5xl text-parchment mt-4 mb-4 font-light">How it works</h2>
            <div className="gold-divider mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '✍️',
                title: 'Write your letter',
                desc: 'Pour your heart into words. Reflect on where you are, who you want to become, what you fear, what you love. Write freely — no one can read it but the future you.'
              },
              {
                step: '02',
                icon: '🔐',
                title: 'Seal & schedule',
                desc: 'Choose exactly when your letter should arrive — any date in the future. Lock it for absolute permanence. Your letter is encrypted the moment you finish writing.'
              },
              {
                step: '03',
                icon: '📬',
                title: 'Receive it in time',
                desc: 'On the exact day you chose, your letter arrives in your inbox — a message from a past version of yourself, a whisper across time.'
              }
            ].map(({ step, icon, title, desc }, i) => (
              <div key={i} className="relative group">
                <div className="card p-8 h-full">
                  <div className="text-5xl mb-5" style={{ animation: `float ${5 + i}s ease-in-out infinite` }}>{icon}</div>
                  <div className="section-label mb-2">{step}</div>
                  <h3 className="font-display text-2xl text-parchment mb-4 font-medium">{title}</h3>
                  <p className="text-parchment/50 font-sans text-sm leading-relaxed">{desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight size={20} className="text-gold/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MOOD TAGS ─── */}
      <section className="py-16 border-t border-[#2a2a3e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-parchment font-light">Tag your emotional state</h2>
            <p className="text-parchment/40 font-sans text-sm mt-2">Letters remember not just words, but how you felt when you wrote them</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {MOODS.map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#2a2a3e] bg-[#16161f] hover:border-gold/30 transition-all cursor-default group">
                <span>{emoji}</span>
                <span className="text-parchment/50 text-sm font-sans group-hover:text-parchment/80 transition-colors">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 border-t border-[#2a2a3e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="section-label">Built to last. Built to trust.</span>
            <h2 className="font-display text-4xl md:text-5xl text-parchment mt-4 mb-4 font-light">Everything you need</h2>
            <div className="gold-divider mt-4" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, accent }, i) => (
              <div key={i} className="card p-7 group">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${accent}`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-sans font-semibold text-parchment text-base mb-2">{title}</h3>
                <p className="text-parchment/40 font-sans text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 border-t border-[#2a2a3e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="section-label">Stories from across time</span>
            <h2 className="font-display text-4xl md:text-5xl text-parchment mt-4 font-light">Words that found their way home</h2>
            <div className="gold-divider mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(({ text, author, location, year }, i) => (
              <div key={i} className="card p-8">
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} className="text-gold fill-gold" />)}
                </div>
                <blockquote className="font-body text-lg italic text-parchment/70 leading-relaxed mb-6">
                  "{text}"
                </blockquote>
                <div className="flex items-center justify-between pt-5 border-t border-[#2a2a3e]">
                  <div>
                    <p className="text-parchment text-sm font-sans font-medium">{author}</p>
                    <p className="text-parchment/30 text-xs font-sans">{location}</p>
                  </div>
                  <span className="badge-delivered">{year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 border-t border-[#2a2a3e]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="relative inline-block mb-8" style={{ animation: 'float 7s ease-in-out infinite', fontSize: '64px' }}>
            ✉️
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-parchment mb-6 font-light">
            Your future self is
            <br />
            <span className="text-gradient">waiting to hear from you.</span>
          </h2>
          <p className="text-parchment/40 font-sans max-w-xl mx-auto mb-10 leading-relaxed">
            Every great journey has a message waiting to be written. What will yours say?
          </p>
          <Link href={user ? '/compose' : '/auth/register'} className="btn-primary text-lg px-10 py-5 group">
            <Feather size={20} />
            {user ? 'Write Your Next Letter' : 'Write Your First Letter'}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-parchment/20 text-xs font-sans mt-5">Free to start. No credit card required.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
