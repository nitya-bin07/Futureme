'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { lettersApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Lock, ArrowLeft, Edit3, Save, Trash2, Calendar, Mail, Tag, Clock, Eye } from 'lucide-react';
import { format, parseISO, formatDistanceToNow, isPast } from 'date-fns';

const MOODS: Record<string, string> = {
  '💭': 'Reflective', '🌱': 'Hopeful', '💪': 'Determined',
  '❤️': 'Loving', '😔': 'Struggling', '🎯': 'Focused',
  '✨': 'Inspired', '🙏': 'Grateful'
};

function LetterPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';

  const [letter, setLetter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isEditing);
  const [locking, setLocking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (user) fetchLetter();
  }, [user, authLoading]);

  const fetchLetter = async () => {
    try {
      const res = await lettersApi.getOne(params.id as string);
      setLetter(res.data.letter);
      setEditForm({ title: res.data.letter.title, content: res.data.letter.content });
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    if (!confirm('Once sealed, this letter can never be edited or deleted. Are you absolutely sure?')) return;
    setLocking(true);
    try {
      await lettersApi.lock(letter.id);
      setLetter((prev: any) => ({ ...prev, is_locked: 1 }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to lock letter');
    } finally {
      setLocking(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await lettersApi.update(letter.id, editForm);
      setLetter((prev: any) => ({ ...prev, ...editForm }));
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this letter? This cannot be undone.')) return;
    await lettersApi.delete(letter.id);
    router.push('/dashboard');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!letter) return null;

  const delivDate = parseISO(letter.delivery_date);
  const moodEmoji = Object.entries(MOODS).find(([_, v]) => v === letter.mood)?.[0];
  const isDelivered = letter.status === 'delivered';
  const isLocked = letter.is_locked;
  const canEdit = !isLocked && !isDelivered;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-parchment/40 hover:text-parchment text-sm font-sans transition-colors">
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <span className="text-parchment/20">/</span>
            <span className="text-parchment/40 text-sm font-sans truncate max-w-xs">{letter.title}</span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm font-sans">
              {error}
            </div>
          )}

          {/* Letter card */}
          <div className="card overflow-hidden">
            {/* Status bar */}
            <div className="px-8 py-4 border-b border-[#2a2a3e] flex items-center justify-between bg-[#0d0d14]">
              <div className="flex items-center gap-3">
                {isLocked && <span className="badge-locked">🔐 Sealed Forever</span>}
                {isDelivered && <span className="badge-delivered">✓ Delivered</span>}
                {!isLocked && !isDelivered && <span className="badge-scheduled">⏳ Scheduled</span>}
                {moodEmoji && (
                  <span className="flex items-center gap-1.5 text-sm text-parchment/50 font-sans">
                    {moodEmoji} {letter.mood}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <>
                    <button
                      onClick={() => editing ? handleSave() : setEditing(true)}
                      className="btn-ghost text-xs py-1.5 px-3"
                      disabled={saving}
                    >
                      {saving ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : editing ? (
                        <><Save size={13} />Save</>
                      ) : (
                        <><Edit3 size={13} />Edit</>
                      )}
                    </button>
                    {!editing && (
                      <>
                        <button onClick={handleLock} disabled={locking} className="btn-ghost text-xs py-1.5 px-3 text-gold/60 hover:text-gold">
                          {locking ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <><Lock size={13} />Seal</>}</button>
                        <Link href={`/letters/preview?id=${letter.id}`} className="btn-ghost text-xs py-1.5 px-3 text-parchment/40 hover:text-parchment">
                          <Eye size={13} />Preview
                        </Link>
                        <button onClick={handleDelete} className="btn-ghost text-xs py-1.5 px-3 text-red-400/50 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                    {editing && (
                      <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 px-3 text-parchment/30">
                        Cancel
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Letter body */}
            <div className="p-8 md:p-12">
              {/* Title */}
              <div className="mb-8">
                <p className="section-label mb-2">
                  Written {formatDistanceToNow(parseISO(letter.created_at), { addSuffix: true })}
                </p>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-transparent border-none outline-none font-display text-3xl text-parchment border-b border-gold/30 pb-2"
                  />
                ) : (
                  <h1 className="font-display text-3xl text-parchment font-light leading-tight">{letter.title}</h1>
                )}
              </div>

              {/* Decorative divider */}
              <div className="flex items-center gap-4 mb-10">
                <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
                <span className="text-gold/40 text-lg">✦</span>
                <div className="flex-1 h-px bg-gradient-to-l from-gold/20 to-transparent" />
              </div>

              {/* Content */}
              {editing ? (
                <textarea
                  value={editForm.content}
                  onChange={e => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                  className="compose-textarea w-full bg-transparent border border-[#2a2a3e] rounded-xl p-6 text-parchment/80 outline-none focus:border-gold/30 min-h-[400px]"
                  style={{ fontSize: '1.1rem', lineHeight: '1.9' }}
                />
              ) : (
                <div className="letter-content whitespace-pre-wrap">{letter.content}</div>
              )}

              <div className="flex items-center gap-4 mt-10 pt-8 border-t border-[#2a2a3e]">
                <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
                <span className="text-gold/40 text-lg">✦</span>
                <div className="flex-1 h-px bg-gradient-to-l from-gold/20 to-transparent" />
              </div>
            </div>

            {/* Metadata footer */}
            <div className="px-8 md:px-12 py-6 border-t border-[#2a2a3e] bg-[#0d0d14]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gold/50 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-parchment/30 font-sans">Delivery Date</p>
                    <p className="text-sm text-parchment/70 font-sans font-medium">
                      {format(delivDate, 'MMM d, yyyy')}
                    </p>
                    {!isDelivered && (
                      <p className="text-xs text-gold/60 font-sans">
                        {isPast(delivDate) ? 'Sending...' : formatDistanceToNow(delivDate, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-gold/50 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-parchment/30 font-sans">Recipient</p>
                    <p className="text-sm text-parchment/70 font-sans font-medium truncate max-w-[120px]">{letter.recipient_name || 'You'}</p>
                    <p className="text-xs text-parchment/30 font-sans truncate max-w-[120px]">{letter.recipient_email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-gold/50 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-parchment/30 font-sans">Word Count</p>
                    <p className="text-sm text-parchment/70 font-sans font-medium">{letter.word_count || letter.content?.split(/\s+/).filter(Boolean).length} words</p>
                    <p className="text-xs text-parchment/30 font-sans">~{Math.ceil((letter.word_count || 100) / 200)} min read</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lock size={14} className="text-gold/50 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-parchment/30 font-sans">Security</p>
                    <p className="text-sm text-parchment/70 font-sans font-medium">AES-256-GCM</p>
                    <p className="text-xs text-parchment/30 font-sans">End-to-end encrypted</p>
                  </div>
                </div>
              </div>

              {letter.tags?.length > 0 && (
                <div className="flex items-center gap-2 mt-5 pt-5 border-t border-[#2a2a3e]">
                  <Tag size={12} className="text-parchment/30" />
                  <div className="flex flex-wrap gap-2">
                    {letter.tags.map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-[#16161f] border border-[#2a2a3e] text-parchment/40 font-sans">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {isLocked && (
                <div className="mt-5 pt-5 border-t border-[#2a2a3e] flex items-center gap-2 text-gold/50">
                  <Lock size={13} />
                  <span className="text-xs font-sans">Sealed on {letter.locked_at ? format(parseISO(letter.locked_at), 'MMM d, yyyy') : 'unknown date'}. This letter cannot be modified.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LetterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    }>
      <LetterPageInner />
    </Suspense>
  );
}
