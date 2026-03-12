'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Users, Mail, CheckCircle, AlertCircle, TrendingUp, Clock, Send, Shield, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [letters, setLetters] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [delivering, setDelivering] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push('/auth/login'); return; }
      if (!isAdmin) { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [user, isAdmin, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, lettersRes, auditRes] = await Promise.all([
        adminApi.stats(),
        adminApi.users({ limit: 50 }),
        adminApi.letters({ limit: 50 }),
        adminApi.auditLogs(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setLetters(lettersRes.data.letters);
      setAuditLogs(auditRes.data.logs);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async (id: string) => {
    if (!confirm('Manually deliver this letter now?')) return;
    setDelivering(id);
    try {
      await adminApi.deliverLetter(id);
      await fetchData();
      alert('Letter delivered successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Delivery failed');
    } finally {
      setDelivering(null);
    }
  };

  const handleToggleUser = async (id: string) => {
    await adminApi.toggleUser(id);
    await fetchData();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Active Users', value: stats.stats.activeUsers, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Total Letters', value: stats.stats.totalLetters, icon: Mail, color: 'text-parchment', bg: 'bg-white/5 border-white/10' },
    { label: 'Scheduled', value: stats.stats.scheduledLetters, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Delivered', value: stats.stats.deliveredLetters, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Failed', value: stats.stats.failedLetters, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  ] : [];

  const tabs = ['overview', 'users', 'letters', 'audit'];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Shield size={18} className="text-gold" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-parchment font-light">Admin Dashboard</h1>
              <p className="text-parchment/40 font-sans text-sm">System overview & management</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`card p-5 border ${bg}`}>
                <Icon size={16} className={`${color} mb-3`} />
                <div className={`font-display text-2xl font-medium mb-0.5 ${color}`}>{value}</div>
                <div className="text-parchment/40 text-xs font-sans">{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-[#2a2a3e] pb-0">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-sans capitalize transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-gold text-gold'
                    : 'border-transparent text-parchment/40 hover:text-parchment'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6 fade-in">
              {/* Recent Users */}
              <div className="card p-6">
                <h3 className="font-sans font-semibold text-parchment text-sm mb-4 flex items-center gap-2">
                  <Users size={15} className="text-gold" />
                  Recent Users
                </h3>
                <div className="space-y-3">
                  {stats?.recentUsers?.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-parchment text-sm font-sans truncate">{u.name}</p>
                        <p className="text-parchment/40 text-xs font-sans truncate">{u.email}</p>
                      </div>
                      <span className="text-parchment/30 text-xs font-sans whitespace-nowrap">
                        {format(parseISO(u.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Stats */}
              <div className="card p-6">
                <h3 className="font-sans font-semibold text-parchment text-sm mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-gold" />
                  Letters by Status
                </h3>
                <div className="space-y-3">
                  {stats?.lettersByStatus?.map(({ status, count }: any) => (
                    <div key={status} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-parchment/70 text-xs font-sans capitalize">{status}</span>
                          <span className="text-parchment text-xs font-sans font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#2a2a3e] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === 'delivered' ? 'bg-emerald-500' :
                              status === 'scheduled' ? 'bg-blue-500' :
                              status === 'failed' ? 'bg-red-500' : 'bg-gold'
                            }`}
                            style={{ width: `${(count / stats.stats.totalLetters) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── USERS TAB ─── */}
          {activeTab === 'users' && (
            <div className="card overflow-hidden fade-in">
              <table className="w-full">
                <thead className="border-b border-[#2a2a3e] bg-[#0d0d14]">
                  <tr>
                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Last Login', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-parchment/30 font-sans uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a3e]">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                            {u.name[0].toUpperCase()}
                          </div>
                          <span className="text-parchment text-sm font-sans">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-parchment/50 text-sm font-sans">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${u.role === 'admin' ? 'badge-locked' : 'badge-draft'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${u.is_active ? 'badge-delivered' : 'badge-failed'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-parchment/40 text-xs font-sans">
                        {format(parseISO(u.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-parchment/40 text-xs font-sans">
                        {u.last_login ? format(parseISO(u.last_login), 'MMM d, yyyy') : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={`text-xs font-sans px-3 py-1.5 rounded-lg border transition-all ${
                            u.is_active
                              ? 'border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40'
                              : 'border-emerald-500/20 text-emerald-400/60 hover:text-emerald-400 hover:border-emerald-500/40'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── LETTERS TAB ─── */}
          {activeTab === 'letters' && (
            <div className="card overflow-hidden fade-in">
              <table className="w-full">
                <thead className="border-b border-[#2a2a3e] bg-[#0d0d14]">
                  <tr>
                    {['Title', 'Author', 'Recipient', 'Delivery Date', 'Status', 'Words', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-parchment/30 font-sans uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a3e]">
                  {letters.map(l => (
                    <tr key={l.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-parchment text-sm font-sans truncate">{l.title}</p>
                      </td>
                      <td className="px-4 py-3 text-parchment/50 text-xs font-sans">{l.user_name}</td>
                      <td className="px-4 py-3 text-parchment/50 text-xs font-sans truncate max-w-[120px]">{l.recipient_email}</td>
                      <td className="px-4 py-3 text-parchment/40 text-xs font-sans">
                        {format(parseISO(l.delivery_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${
                          l.status === 'delivered' ? 'badge-delivered' :
                          l.status === 'failed' ? 'badge-failed' :
                          l.is_locked ? 'badge-locked' : 'badge-scheduled'
                        }`}>
                          {l.status === 'delivered' ? '✓ Delivered' : l.status === 'failed' ? '✗ Failed' : l.is_locked ? '🔐 Sealed' : '⏳ Scheduled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-parchment/40 text-xs font-sans">{l.word_count || '—'}</td>
                      <td className="px-4 py-3">
                        {l.status !== 'delivered' && (
                          <button
                            onClick={() => handleDeliver(l.id)}
                            disabled={delivering === l.id}
                            className="flex items-center gap-1.5 text-xs border border-gold/20 text-gold/60 hover:text-gold hover:border-gold/40 px-3 py-1.5 rounded-lg transition-all font-sans"
                          >
                            {delivering === l.id ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <><Send size={11} />Deliver Now</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── AUDIT TAB ─── */}
          {activeTab === 'audit' && (
            <div className="card overflow-hidden fade-in">
              <table className="w-full">
                <thead className="border-b border-[#2a2a3e] bg-[#0d0d14]">
                  <tr>
                    {['Action', 'User', 'Resource', 'Time'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-parchment/30 font-sans uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a3e]">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Activity size={12} className="text-gold/50" />
                          <span className="text-parchment text-sm font-mono">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-parchment/50 text-xs font-sans">{log.user_email || 'System'}</td>
                      <td className="px-4 py-3 text-parchment/40 text-xs font-mono">
                        {log.resource_type ? `${log.resource_type}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-parchment/30 text-xs font-sans">
                        {format(parseISO(log.created_at), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
