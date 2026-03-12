'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Lock, Calendar, User, Tag, Feather } from 'lucide-react';

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const letterId = searchParams.get('id');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [letter, setLetter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!letterId) { router.push('/dashboard'); return; }
    if (user) fetchPreview();
  }, [user, authLoading, letterId]);

  const fetchPreview = async () => {
    try {
      const res = await api.get(`/user/letters/${letterId}/preview`);
      setLetter(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load preview');
    } finally { setLoading(false); }
  };

  const daysUntil = letter ? Math.ceil((new Date(letter.delivery_date).getTime() - Date.now()) / 86400000) : 0;
  const deliveryDateStr = letter ? new Date(letter.delivery_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-10 text-center max-w-md">
        <p className="text-red-400 font-sans mb-4">{error}</p>
        <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0d0d14 0%, #16161f 50%, #0d0d14 100%)' }}>
      {/* Grain overlay */}
      <div className="grain fixed inset-0 pointer-events-none opacity-30" />

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href={`/letters/${letterId}`} className="btn-ghost text-sm">
            <ArrowLeft size={14} />Back to Edit
          </Link>
          <div className="flex items-center gap-2 text-gold/60 text-xs font-sans bg-gold/5 border border-gold/15 rounded-full px-3 py-1.5">
            <Feather size={11} />
            Preview Mode
          </div>
        </div>

        {/* Envelope header */}
        <div className="text-center mb-10 fade-up">
          <div className="text-5xl mb-4" style={{ animation: 'float 5s ease-in-out infinite' }}>✉️</div>
          <p className="text-parchment/30 font-sans text-sm">This is how your letter will arrive</p>
          {daysUntil > 0 && (
            <div className="inline-flex items-center gap-2 mt-3 bg-[#16161f] border border-[#2a2a3e] rounded-full px-4 py-2">
              <Calendar size={13} className="text-gold" />
              <span className="text-parchment/60 text-sm font-sans">
                Delivers in <strong className="text-parchment">{daysUntil.toLocaleString()}</strong> days
              </span>
            </div>
          )}
        </div>

        {/* The Letter — styled as email/paper */}
        <div className="fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(201,169,110,0.08)]"
            style={{ background: '#faf8f2', border: '1px solid rgba(201,169,110,0.2)' }}>

            {/* Letterhead */}
            <div className="px-8 pt-8 pb-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)', background: 'linear-gradient(to bottom, #fff9ee, #faf8f2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Feather size={14} style={{ color: '#9a7a3a' }} />
                <span className="text-xs font-sans" style={{ color: '#9a7a3a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  FutureMe — A Letter From Your Past
                </span>
              </div>
              <div className="h-px w-full mt-3" style={{ background: 'linear-gradient(to right, rgba(201,169,110,0.4), transparent)' }} />
            </div>

            {/* To/From/Date header */}
            <div className="px-8 py-5 text-sm" style={{ background: '#fdf9f0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#5c4a1e' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider opacity-50 block mb-0.5">To</span>
                  <span className="font-medium">{letter?.recipient_name || 'Future Me'}</span>
                  <span className="text-xs opacity-60 block">{letter?.recipient_email}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider opacity-50 block mb-0.5">To Be Opened</span>
                  <span className="font-medium text-xs">{deliveryDateStr}</span>
                </div>
              </div>
            </div>

            {/* Letter body */}
            <div className="px-8 py-8" style={{ color: '#2c1f0a' }}>
              <h1 className="font-serif text-2xl mb-6" style={{ color: '#1a0f02', fontFamily: "'Playfair Display', serif" }}>
                {letter?.title}
              </h1>
              {letter?.content && (
                <div className="font-serif text-base leading-[1.85] letter-preview-content"
                  style={{ fontFamily: "'Crimson Text', Georgia, serif", color: '#2c1f0a' }}
                  dangerouslySetInnerHTML={{ __html: letter.content }} />
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t text-center" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#fdf9f0' }}>
              {letter?.mood && (
                <div className="inline-flex items-center gap-1.5 text-xs font-sans mb-2" style={{ color: '#9a7a3a' }}>
                  <span>Written with</span>
                  <span className="font-semibold">{letter.mood}</span>
                </div>
              )}
              {letter?.tags?.length > 0 && (
                <div className="flex items-center justify-center flex-wrap gap-1.5 mt-2">
                  {letter.tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(201,169,110,0.12)', color: '#9a7a3a', border: '1px solid rgba(201,169,110,0.2)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs mt-4 opacity-40" style={{ color: '#5c4a1e' }}>
                Written {new Date(letter?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · {letter?.word_count} words · Encrypted with AES-256-GCM
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-8 fade-up" style={{ animationDelay: '0.2s' }}>
          <Link href={`/letters/${letterId}`} className="btn-secondary">
            Edit Letter
          </Link>
          <Link href={`/letters/${letterId}`} className="btn-primary">
            <Lock size={14} />
            Seal Letter
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .letter-preview-content p { margin-bottom: 1em; }
        .letter-preview-content blockquote { border-left: 3px solid rgba(201,169,110,0.5); padding-left: 1rem; font-style: italic; color: #5c4a1e; margin: 1rem 0; }
        .letter-preview-content strong { color: #1a0f02; font-weight: 600; }
        .letter-preview-content em { font-style: italic; }
        .letter-preview-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1em; }
        .letter-preview-content ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 1em; }
        .letter-preview-content mark { background: rgba(201,169,110,0.25); padding: 0 2px; border-radius: 2px; }
        .letter-preview-content a { color: #9a7a3a; text-decoration: underline; }
      `}</style>
    </div>
  );
}
