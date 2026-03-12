'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { User, Mail, Lock, Bell, Shield, ArrowLeft, Check, Save, Eye, EyeOff, Download, Trash2, Coins } from 'lucide-react';

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#2a2a3e]">
        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Icon size={15} className="text-gold" />
        </div>
        <h2 className="font-sans font-semibold text-parchment">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState({ name: '', backup_email: '' });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (user) setProfile({ name: user.name, backup_email: '' });
  }, [user, authLoading]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(''); setProfileMsg('');
    setProfileLoading(true);
    try {
      await authApi.updateProfile({ name: profile.name, backup_email: profile.backup_email });
      // Update local storage
      const stored = JSON.parse(localStorage.getItem('fm_user') || '{}');
      stored.name = profile.name;
      localStorage.setItem('fm_user', JSON.stringify(stored));
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Update failed');
    } finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    if (passwords.newPw !== passwords.confirm) { setPwError('Passwords do not match'); return; }
    if (passwords.newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPw });
      setPwMsg('Password changed successfully!');
      setPasswords({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Password change failed');
    } finally { setPwLoading(false); }
  };

  // Credits model — no plan tiers

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('fm_token');
      const res = await fetch('/api/user/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `futureme-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    } catch (err) { alert('Export failed'); }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-6">

          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="btn-ghost">
              <ArrowLeft size={14} />Back
            </Link>
            <div>
              <h1 className="font-display text-3xl text-parchment font-light">Profile Settings</h1>
              <p className="text-parchment/40 font-sans text-sm mt-0.5">Manage your account</p>
            </div>
          </div>

          <div className="space-y-6">

            {/* Avatar + Plan banner */}
            <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/40 flex items-center justify-center">
                  <span className="font-display text-3xl text-gold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0d0d14] bg-gold/20 border-gold/40 flex items-center justify-center text-xs text-gold font-bold">
                  {(user as any)?.letter_credits ?? 0}
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="font-display text-xl text-parchment">{user?.name}</h2>
                <p className="text-parchment/40 font-sans text-sm">{user?.email}</p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border border-gold/20 bg-gold/8 text-gold text-xs font-sans">
                  <Coins size={11} /> {(user as any)?.letter_credits ?? 0} letter credits
                </div>
              </div>
              <Link href="/pricing" className="btn-secondary text-sm">
                <Coins size={13} />Buy Credits
              </Link>
            </div>

            {/* Profile Info */}
            <Section title="Personal Information" icon={User}>
              {profileMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-emerald-400 text-sm font-sans">
                  <Check size={14} />{profileMsg}
                </div>
              )}
              {profileError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm font-sans">{profileError}</div>
              )}
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Display Name</label>
                  <input type="text" value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="input-field" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Primary Email</label>
                  <input type="email" value={user?.email || ''} disabled
                    className="input-field opacity-50 cursor-not-allowed" />
                  <p className="text-parchment/20 text-xs font-sans mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">
                    Backup Email <span className="text-parchment/20 normal-case">(optional)</span>
                  </label>
                  <input type="email" value={profile.backup_email}
                    onChange={e => setProfile(p => ({ ...p, backup_email: e.target.value }))}
                    className="input-field" placeholder="backup@email.com" />
                  <p className="text-parchment/30 text-xs font-sans mt-1.5">
                    Letters will also be sent here as a backup delivery. Recommended for important letters.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary" disabled={profileLoading}>
                    {profileLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </Section>

            {/* Password */}
            <Section title="Change Password" icon={Lock}>
              {pwMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-emerald-400 text-sm font-sans">
                  <Check size={14} />{pwMsg}
                </div>
              )}
              {pwError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm font-sans">{pwError}</div>
              )}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Current Password</label>
                  <input type="password" value={passwords.current}
                    onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                    className="input-field" placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={passwords.newPw}
                      onChange={e => setPasswords(p => ({ ...p, newPw: e.target.value }))}
                      className="input-field pr-11" placeholder="At least 8 characters" required />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/30 hover:text-parchment/60">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-parchment/50 font-sans uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input type="password" value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    className="input-field" placeholder="Repeat new password" required />
                  {passwords.confirm && passwords.newPw !== passwords.confirm && (
                    <p className="text-red-400 text-xs mt-1.5 font-sans">Passwords don't match</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary" disabled={pwLoading}>
                    {pwLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Lock size={15} />}
                    Update Password
                  </button>
                </div>
              </form>
            </Section>

            {/* Security Info */}
            <Section title="Security" icon={Shield}>
              <div className="space-y-4">
                {[
                  { label: 'Letter Encryption', value: 'AES-256-GCM', status: 'active' },
                  { label: 'Password Hashing', value: 'bcrypt (12 rounds)', status: 'active' },
                  { label: 'Session Tokens', value: 'JWT (7-day expiry)', status: 'active' },
                  { label: 'Two-Factor Auth', value: 'Not enabled', status: 'inactive' },
                ].map(({ label, value, status }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-[#2a2a3e] last:border-0">
                    <div>
                      <p className="text-parchment text-sm font-sans">{label}</p>
                      <p className="text-parchment/40 text-xs font-sans">{value}</p>
                    </div>
                    <span className={`badge text-xs ${status === 'active' ? 'badge-delivered' : 'badge-draft'}`}>
                      {status === 'active' ? '✓ Active' : '○ Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Credits */}
            <Section title="Letter Credits" icon={Coins}>
              <div className="flex items-center gap-5 mb-5">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center font-display text-3xl flex-shrink-0
                  ${((user as any)?.letter_credits ?? 0) === 0
                    ? 'border-red-500/20 bg-red-500/5 text-red-400'
                    : ((user as any)?.letter_credits ?? 0) <= 2
                    ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                    : 'border-gold/30 bg-gold/5 text-gold'}`}>
                  {(user as any)?.letter_credits ?? 0}
                </div>
                <div>
                  <p className="text-parchment font-sans font-medium">
                    {((user as any)?.letter_credits ?? 0) === 0
                      ? 'No credits remaining'
                      : `${(user as any)?.letter_credits} letter credit${((user as any)?.letter_credits ?? 0) === 1 ? '' : 's'} remaining`}
                  </p>
                  <p className="text-parchment/40 text-xs font-sans mt-1">1 credit = 1 letter · Credits never expire</p>
                </div>
              </div>
              <ul className="space-y-2 mb-5">
                {['Free first letter on signup', 'Credits never expire', 'No subscriptions — pay only when you need', 'Buy packages: 1, 5, 12, or 30 letters'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-parchment/60 font-sans">
                    <Check size={12} className="text-gold flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="btn-primary">
                <Coins size={14} />Buy More Credits
              </Link>
            </Section>

            {/* GDPR */}
            <Section title="Data & Privacy" icon={Download}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-parchment text-sm font-sans">Export Your Data</p>
                    <p className="text-parchment/40 text-xs font-sans mt-0.5">Download all your letters and account data as JSON (GDPR compliant)</p>
                  </div>
                  <button onClick={handleExport} className="btn-secondary text-xs flex-shrink-0">
                    <Download size={13} />Export
                  </button>
                </div>
                <div className="border-t border-[#2a2a3e] pt-4 flex items-start justify-between">
                  <div>
                    <p className="text-red-400/80 text-sm font-sans">Delete Account</p>
                    <p className="text-parchment/30 text-xs font-sans mt-0.5">Permanently delete your account and all letters. This cannot be undone.</p>
                  </div>
                  <button className="btn-ghost text-xs text-red-400/50 hover:text-red-400 flex-shrink-0 border border-red-500/20 hover:border-red-500/40">
                    <Trash2 size={13} />Delete
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}
