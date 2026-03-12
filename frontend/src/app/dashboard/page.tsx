'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { lettersApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PenLine, Clock, CheckCircle, Lock, BookOpen, Calendar, Trash2, Edit, Eye, TrendingUp, Feather, Coins } from 'lucide-react';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';

const MOODS: Record<string, string> = {
  '💭': 'Reflective', '🌱': 'Hopeful', '💪': 'Determined',
  '❤️': 'Loving', '😔': 'Struggling', '🎯': 'Focused',
  '✨': 'Inspired', '🙏': 'Grateful'
};

function StatusBadge({ status, isLocked }: { status: string; isLocked: boolean }) {
  if (isLocked && status !== 'delivered') return <span className="badge-locked">🔐 Sealed</span>;
  if (status === 'delivered') return <span className="badge-delivered">✓ Delivered</span>;
  if (status === 'scheduled') return <span className="badge-scheduled">⏳ Scheduled</span>;
  if (status === 'failed') return <span className="badge-failed">✗ Failed</span>;
  return <span className="badge-draft">Draft</span>;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, lettersRes] = await Promise.all([
        lettersApi.stats(),
        lettersApi.getAll({ limit: 50 })
      ]);
      setStats(statsRes.data);
      setLetters(lettersRes.data.letters);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this letter? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await lettersApi.delete(id);
      setLetters(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = letters.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'draft') return l.status === 'draft';
    if (filter === 'scheduled') return l.status === 'scheduled';
    if (filter === 'delivered') return l.status === 'delivered';
    if (filter === 'locked') return l.is_locked;
    return true;
  });

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="section-label">Your collection</span>
              <h1 className="font-display text-4xl text-parchment mt-2 font-light">
                Hello, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-parchment/40 font-sans text-sm mt-1.5">
                {loading ? '...' : `${stats?.stats?.total || 0} letters sealed in time`}
              </p>
            </div>
            <Link href="/compose" className="btn-primary">
              <PenLine size={16} />
              Write New Letter
            </Link>
          </div>

          {/* Stats Grid */}
          {!loading && stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
              {[
                { label: 'Total Letters', value: stats.stats.total, icon: BookOpen, color: 'text-parchment' },
                { label: 'Scheduled', value: stats.stats.scheduled, icon: Clock, color: 'text-blue-400' },
                { label: 'Delivered', value: stats.stats.delivered, icon: CheckCircle, color: 'text-emerald-400' },
                { label: 'Sealed', value: stats.stats.locked, icon: Lock, color: 'text-gold' },
                { label: 'Total Words', value: stats.stats.totalWords?.toLocaleString(), icon: TrendingUp, color: 'text-purple-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <Icon size={16} className={`${color} mb-3`} />
                  <div className={`font-display text-2xl font-medium mb-0.5 ${color}`}>{value ?? 0}</div>
                  <div className="text-parchment/40 text-xs font-sans">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Credits Banner */}
          {!loading && (
            <div className={`rounded-2xl border p-4 mb-6 flex items-center justify-between gap-4
              ${(stats?.stats?.credits ?? user?.letter_credits ?? 0) === 0
                ? 'bg-red-500/5 border-red-500/20'
                : (stats?.stats?.credits ?? user?.letter_credits ?? 0) <= 2
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-gold/3 border-gold/15'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${(stats?.stats?.credits ?? user?.letter_credits ?? 0) === 0
                    ? 'border-red-500/30 text-red-400 bg-red-500/10'
                    : (stats?.stats?.credits ?? user?.letter_credits ?? 0) <= 2
                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                    : 'border-gold/30 text-gold bg-gold/10'
                  }`}>
                  {stats?.stats?.credits ?? user?.letter_credits ?? 0}
                </div>
                <div>
                  <p className="text-parchment text-sm font-sans font-medium">
                    {(stats?.stats?.credits ?? user?.letter_credits ?? 0) === 0
                      ? 'No letter credits — buy more to keep writing'
                      : (stats?.stats?.credits ?? user?.letter_credits ?? 0) === 1
                      ? '1 letter credit remaining'
                      : `${stats?.stats?.credits ?? user?.letter_credits ?? 0} letter credits remaining`}
                  </p>
                  <p className="text-parchment/30 text-xs font-sans">Credits never expire · 1 credit per letter</p>
                </div>
              </div>
              <Link href="/pricing" className="btn-secondary text-xs flex-shrink-0 py-2">
                <Coins size={13} />Buy Credits
              </Link>
            </div>
          )}

          {/* Upcoming deliveries */}
          {!loading && stats?.upcoming?.length > 0 && (
            <div className="card p-6 mb-8">
              <h3 className="font-sans font-semibold text-parchment text-sm mb-4 flex items-center gap-2">
                <Calendar size={15} className="text-gold" />
                Upcoming Deliveries
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {stats.upcoming.map((l: any) => (
                  <div key={l.id} className="bg-[#0d0d14] rounded-lg p-4 border border-[#2a2a3e]">
                    <p className="text-parchment text-sm font-sans font-medium truncate">{l.title}</p>
                    <p className="text-parchment/40 text-xs font-sans mt-1">
                      To: {l.recipient_name || 'You'}
                    </p>
                    <p className="text-gold text-xs font-sans mt-2 font-medium">
                      {format(parseISO(l.delivery_date), 'MMM d, yyyy')} · {formatDistanceToNow(parseISO(l.delivery_date), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
            {[
              { key: 'all', label: 'All Letters' },
              { key: 'draft', label: 'Drafts' },
              { key: 'scheduled', label: 'Scheduled' },
              { key: 'delivered', label: 'Delivered' },
              { key: 'locked', label: 'Sealed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-sans whitespace-nowrap transition-all ${
                  filter === key
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-parchment/50 hover:text-parchment border border-transparent hover:border-[#2a2a3e]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Letters grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-3 bg-[#2a2a3e] rounded w-1/3 mb-4" />
                  <div className="h-5 bg-[#2a2a3e] rounded w-3/4 mb-3" />
                  <div className="h-3 bg-[#2a2a3e] rounded w-full mb-2" />
                  <div className="h-3 bg-[#2a2a3e] rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4" style={{ animation: 'float 5s ease-in-out infinite' }}>✉️</div>
              <h3 className="font-display text-2xl text-parchment/60 mb-2 font-light">
                {filter === 'all' ? 'No letters yet' : `No ${filter} letters`}
              </h3>
              <p className="text-parchment/30 font-sans text-sm mb-6">
                {filter === 'all' ? 'Write your first letter to your future self.' : 'Try a different filter.'}
              </p>
              {filter === 'all' && (
                <Link href="/compose" className="btn-primary">
                  <Feather size={16} />
                  Write Your First Letter
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((letter) => {
                const delivDate = letter.delivery_date ? parseISO(letter.delivery_date) : new Date();
                const isDelivered = letter.status === 'delivered';
                const moodEmoji = letter.mood ? Object.entries(MOODS).find(([_, v]) => v === letter.mood)?.[0] : null;

                return (
                  <div key={letter.id} className="card p-6 flex flex-col group">
                    <div className="flex items-start justify-between mb-4">
                      <StatusBadge status={letter.status} isLocked={letter.is_locked} />
                      {moodEmoji && <span className="text-xl">{moodEmoji}</span>}
                    </div>

                    <h3 className="font-display text-lg text-parchment mb-2 font-medium line-clamp-2">
                      {letter.title}
                    </h3>

                    <p className="text-parchment/40 font-sans text-sm leading-relaxed line-clamp-3 flex-1 mb-4">
                      {letter.preview}
                    </p>

                    {letter.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {letter.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[#0d0d14] border border-[#2a2a3e] text-parchment/40 font-sans">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                  <div className="pt-4 border-t border-[#2a2a3e]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-parchment/30 font-sans">
                            {letter.status === 'draft' ? 'Draft' : isDelivered ? 'Delivered' : isPast(delivDate) ? 'Sending...' : 'Delivers'}
                          </p>
                          <p className="text-xs text-parchment/60 font-sans font-medium">
                            {letter.status === 'draft' && !letter.delivery_date ? 'No date set' : format(delivDate, 'MMM d, yyyy')}
                            {!isDelivered && !isPast(delivDate) && letter.status !== 'draft' && (
                              <span className="text-gold ml-1">· {formatDistanceToNow(delivDate)}</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-parchment/30 font-sans">{letter.word_count} words</p>
                          <p className="text-xs text-parchment/40 font-sans">To: {letter.recipient_email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {letter.status === 'draft' ? (
                          <Link href={`/compose?draft=${letter.id}`} className="btn-primary flex-1 justify-center text-xs py-2">
                            <Edit size={13} />Continue Editing
                          </Link>
                        ) : (
                          <Link href={`/letters/${letter.id}`} className="btn-ghost flex-1 justify-center text-xs py-2">
                            <Eye size={13} />View
                          </Link>
                        )}
                        {!letter.is_locked && letter.status !== 'delivered' && (
                          <>
                            <Link href={`/letters/${letter.id}?edit=true`} className="btn-ghost text-xs py-2 px-3">
                              <Edit size={13} />
                            </Link>
                            <button
                              onClick={() => handleDelete(letter.id)}
                              disabled={deleting === letter.id}
                              className="btn-ghost text-red-400/50 hover:text-red-400 text-xs py-2 px-3"
                            >
                              {deleting === letter.id ? (
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
