'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { analyticsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { TrendingUp, BookOpen, CheckCircle, Clock, Lock, Users, Tag, Calendar, Feather, BarChart2 } from 'lucide-react';

const MOOD_COLORS: Record<string, string> = {
  'Hopeful': '#10b981', 'Reflective': '#6366f1', 'Determined': '#f59e0b',
  'Loving': '#ec4899', 'Struggling': '#ef4444', 'Focused': '#3b82f6',
  'Inspired': '#8b5cf6', 'Grateful': '#c9a96e',
};

function AnimatedBar({ value, max, color = '#c9a96e', delay = 0 }: any) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max > 0 ? (value / max) * 100 : 0), delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div className="h-full rounded-sm" style={{ width: `${width}%`, background: color, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="card p-5 group hover:scale-[1.02] transition-transform duration-300">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${color}`}>
        <Icon size={16} className="opacity-80" />
      </div>
      <div className="font-display text-3xl text-parchment font-medium mb-0.5">{value ?? 0}</div>
      <div className="text-parchment/40 text-xs font-sans">{label}</div>
      {sub && <div className="text-parchment/25 text-xs font-sans mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchAnalytics();
  }, [user, authLoading]);

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsApi.overview();
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-gold/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-parchment/30 font-sans text-sm">Brewing your insights...</p>
      </div>
    </div>
  );

  const s = data?.stats || {};
  const byMonth: any[] = data?.byMonth || [];
  const byMood: any[] = data?.byMood || [];
  const deliverySpread: any[] = data?.deliverySpread || [];
  const topTags: any[] = data?.topTags || [];
  const wordTrend: any[] = data?.wordTrend || [];
  const maxMonthCount = Math.max(...byMonth.map((m: any) => m.count), 1);
  const maxMoodCount = Math.max(...byMood.map((m: any) => m.count), 1);
  const maxTagCount = Math.max(...topTags.map((t: any) => t.count), 1);
  const maxWords = Math.max(...byMonth.map((m: any) => m.words), 1);

  // Generate last 12 months labels
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="section-label">Your story in numbers</span>
              <h1 className="font-display text-4xl text-parchment mt-2 font-light">Analytics</h1>
              <p className="text-parchment/40 font-sans text-sm mt-1">Track your emotional journey through time</p>
            </div>
            <Link href="/compose" className="btn-primary">
              <Feather size={15} />Write Letter
            </Link>
          </div>

          {s.total === 0 ? (
            <div className="text-center py-24 card">
              <div className="text-7xl mb-5" style={{ animation: 'float 5s ease-in-out infinite' }}>📊</div>
              <h3 className="font-display text-2xl text-parchment/50 font-light mb-3">No data yet</h3>
              <p className="text-parchment/30 font-sans text-sm mb-6">Write your first letter to start seeing analytics</p>
              <Link href="/compose" className="btn-primary">Write Your First Letter</Link>
            </div>
          ) : (
            <>
              {/* ── Stat Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <StatCard label="Total Letters" value={s.total} icon={BookOpen} color="text-parchment border-white/10 bg-white/5" />
                <StatCard label="Scheduled" value={s.scheduled} icon={Clock} color="text-blue-400 border-blue-500/20 bg-blue-500/5" />
                <StatCard label="Delivered" value={s.delivered} icon={CheckCircle} color="text-emerald-400 border-emerald-500/20 bg-emerald-500/5" />
                <StatCard label="Sealed" value={s.sealed} icon={Lock} color="text-gold border-gold/20 bg-gold/5" />
                <StatCard label="Collaborative" value={s.collaborative} icon={Users} color="text-purple-400 border-purple-500/20 bg-purple-500/5" />
                <StatCard label="Total Words" value={s.total_words?.toLocaleString()} icon={TrendingUp} color="text-rose-400 border-rose-500/20 bg-rose-500/5" sub={`avg ${Math.round(s.avg_words || 0)}/letter`} />
                <StatCard label="Longest" value={`${s.longest_letter || 0}w`} icon={BarChart2} color="text-amber-400 border-amber-500/20 bg-amber-500/5" sub="word record" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* ── Letters per Month Bar Chart ── */}
                <div className="card p-6 lg:col-span-2">
                  <h3 className="font-sans font-semibold text-parchment text-sm mb-1 flex items-center gap-2">
                    <BarChart2 size={15} className="text-gold" />
                    Letters Written (Last 12 Months)
                  </h3>
                  <p className="text-parchment/30 text-xs font-sans mb-6">Monthly writing activity</p>
                  <div className="flex items-end gap-2 h-36">
                    {last12.map((month, i) => {
                      const m = byMonth.find((b: any) => b.month === month);
                      const count = m?.count || 0;
                      const heightPct = maxMonthCount > 0 ? (count / maxMonthCount) * 100 : 0;
                      const label = new Date(month + '-02').toLocaleDateString('en-US', { month: 'short' });
                      return (
                        <div key={month} className="flex flex-col items-center gap-1 flex-1 group relative">
                          {count > 0 && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gold text-void-700 text-xs px-1.5 py-0.5 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {count} letter{count !== 1 ? 's' : ''}
                            </div>
                          )}
                          <div className="flex-1 w-full flex items-end rounded-t overflow-hidden" style={{ minHeight: 4 }}>
                            <div className="w-full rounded-t transition-all duration-700 ease-out"
                              style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 3)}%`, background: count > 0 ? 'linear-gradient(to top, #9a7a3a, #e8c98a)' : '#2a2a3e' }} />
                          </div>
                          <span className="text-parchment/25 text-[10px] font-sans">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Mood Breakdown ── */}
                <div className="card p-6">
                  <h3 className="font-sans font-semibold text-parchment text-sm mb-1 flex items-center gap-2">
                    ✨ Emotional Landscape
                  </h3>
                  <p className="text-parchment/30 text-xs font-sans mb-5">How you felt while writing</p>
                  {byMood.length === 0 ? (
                    <p className="text-parchment/30 text-sm font-sans text-center py-6">No moods tagged yet</p>
                  ) : (
                    <div className="space-y-3">
                      {byMood.map(({ mood, count }: any, i: number) => (
                        <div key={mood}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-parchment/70 text-xs font-sans">{mood}</span>
                            <span className="text-parchment/40 text-xs font-sans">{count}</span>
                          </div>
                          <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                            <AnimatedBar value={count} max={maxMoodCount} color={MOOD_COLORS[mood] || '#c9a96e'} delay={i * 100} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Delivery Spread ── */}
                <div className="card p-6">
                  <h3 className="font-sans font-semibold text-parchment text-sm mb-1 flex items-center gap-2">
                    <Calendar size={15} className="text-blue-400" />
                    How Far Into the Future
                  </h3>
                  <p className="text-parchment/30 text-xs font-sans mb-5">Delivery date distribution</p>
                  {deliverySpread.length === 0 ? (
                    <p className="text-parchment/30 text-sm font-sans text-center py-6">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {deliverySpread.map(({ range, count }: any, i: number) => {
                        const max = Math.max(...deliverySpread.map((d: any) => d.count));
                        return (
                          <div key={range}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-parchment/70 text-xs font-sans">{range}</span>
                              <span className="text-parchment/40 text-xs font-sans">{count}</span>
                            </div>
                            <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                              <AnimatedBar value={count} max={max} color="#6366f1" delay={i * 100} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Word Count Trend ── */}
                <div className="card p-6">
                  <h3 className="font-sans font-semibold text-parchment text-sm mb-1 flex items-center gap-2">
                    <TrendingUp size={15} className="text-rose-400" />
                    Avg Words Per Letter
                  </h3>
                  <p className="text-parchment/30 text-xs font-sans mb-5">Are you writing more over time?</p>
                  {wordTrend.length === 0 ? (
                    <p className="text-parchment/30 text-sm font-sans text-center py-6">No data yet</p>
                  ) : (
                    <div className="flex items-end gap-1.5 h-24">
                      {last12.map((month, i) => {
                        const m = wordTrend.find((w: any) => w.month === month);
                        const words = m ? Math.round(m.avg_words) : 0;
                        const maxW = Math.max(...wordTrend.map((w: any) => w.avg_words), 1);
                        const h = words > 0 ? Math.max((words / maxW) * 100, 10) : 4;
                        return (
                          <div key={month} className="flex-1 group relative flex flex-col items-center justify-end">
                            {words > 0 && (
                              <div className="absolute -top-6 text-[10px] text-parchment/40 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {words}w
                              </div>
                            )}
                            <div className="w-full rounded-t transition-all duration-700"
                              style={{ height: `${h}%`, background: words > 0 ? 'linear-gradient(to top, #ef4444, #fca5a5)' : '#2a2a3e' }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Top Tags ── */}
                <div className="card p-6">
                  <h3 className="font-sans font-semibold text-parchment text-sm mb-1 flex items-center gap-2">
                    <Tag size={15} className="text-amber-400" />
                    Top Tags
                  </h3>
                  <p className="text-parchment/30 text-xs font-sans mb-5">Most used themes in your letters</p>
                  {topTags.length === 0 ? (
                    <p className="text-parchment/30 text-sm font-sans text-center py-6">No tags used yet</p>
                  ) : (
                    <div className="space-y-2.5">
                      {topTags.map(({ tag, count }: any, i: number) => (
                        <div key={tag} className="flex items-center gap-3">
                          <span className="text-parchment/30 text-xs font-mono w-4 text-right">{i + 1}</span>
                          <div className="flex-1 h-6 bg-[#0d0d14] rounded-md overflow-hidden border border-[#2a2a3e]">
                            <div className="h-full flex items-center px-2 transition-all duration-700 ease-out"
                              style={{ width: `${(count / maxTagCount) * 100}%`, background: 'linear-gradient(to right, rgba(201,169,110,0.15), rgba(201,169,110,0.3))' }}>
                              <span className="text-gold text-xs font-sans whitespace-nowrap">#{tag}</span>
                            </div>
                          </div>
                          <span className="text-parchment/40 text-xs font-sans w-4">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Writing Days Heatmap ── */}
                {data?.writingDays?.length > 0 && (
                  <div className="card p-6 md:col-span-2 lg:col-span-3">
                    <h3 className="font-sans font-semibold text-parchment text-sm mb-1">📅 Writing Activity</h3>
                    <p className="text-parchment/30 text-xs font-sans mb-4">Days you wrote a letter</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 52 }, (_, week) =>
                        Array.from({ length: 7 }, (_, day) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (51 - week) * 7 - (6 - day));
                          const ds = d.toISOString().slice(0, 10);
                          const active = data.writingDays.includes(ds);
                          return (
                            <div key={ds} title={active ? ds : undefined}
                              className={`w-2.5 h-2.5 rounded-sm transition-all ${active ? 'bg-gold' : 'bg-[#2a2a3e]'}`} />
                          );
                        })
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2a2a3e]" />
                      <span className="text-parchment/20 text-xs font-sans">No letter</span>
                      <div className="w-2.5 h-2.5 rounded-sm bg-gold ml-3" />
                      <span className="text-parchment/20 text-xs font-sans">Letter written</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
