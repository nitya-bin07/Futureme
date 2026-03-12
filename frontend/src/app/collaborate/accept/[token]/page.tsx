'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { collabApi } from '@/lib/api';
import Link from 'next/link';
import { Users, CheckCircle, XCircle, Feather, ArrowRight } from 'lucide-react';

export default function AcceptCollabPage() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs-login'>('loading');
  const [letter, setLetter] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('needs-login');
      return;
    }
    acceptInvite();
  }, [user, authLoading]);

  const acceptInvite = async () => {
    try {
      const res = await collabApi.acceptInvite(token as string);
      setLetter(res.data.letter);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to accept invitation');
      setStatus('error');
    }
  };

  if (authLoading || status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-parchment/40 font-sans text-sm">Accepting invitation...</p>
      </div>
    </div>
  );

  if (status === 'needs-login') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-6">
          <Feather size={28} className="text-gold" />
        </div>
        <h1 className="font-display text-2xl text-parchment mb-2">You've been invited</h1>
        <p className="text-parchment/50 font-sans text-sm mb-6 leading-relaxed">
          Someone wants you to contribute to their letter. Sign in or create an account to accept.
        </p>
        <div className="space-y-3">
          <Link href={`/auth/login?redirect=/collaborate/accept/${token}`} className="btn-primary w-full justify-center">
            Sign In to Accept
          </Link>
          <Link href={`/auth/register?redirect=/collaborate/accept/${token}`} className="btn-secondary w-full justify-center">
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <XCircle size={28} className="text-red-400" />
        </div>
        <h1 className="font-display text-2xl text-parchment mb-2">Invitation Issue</h1>
        <p className="text-red-400/80 font-sans text-sm mb-6">{errorMsg}</p>
        <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-10 max-w-md w-full text-center fade-up">
        <div className="text-6xl mb-5" style={{ animation: 'float 4s ease-in-out infinite' }}>📜</div>
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <h1 className="font-display text-2xl text-parchment mb-2">Invitation Accepted!</h1>
        <div className="gold-divider my-4" />
        {letter && (
          <div className="bg-[#0d0d14] rounded-xl p-4 mb-6 border border-[#2a2a3e]">
            <p className="text-parchment/40 text-xs font-sans mb-1">You're now a collaborator on</p>
            <p className="text-parchment font-display text-lg">"{letter.title}"</p>
          </div>
        )}
        <p className="text-parchment/50 font-sans text-sm leading-relaxed mb-6">
          You can now add your contribution to this letter. It will be sealed and delivered together.
        </p>
        <div className="space-y-3">
          {letter && (
            <Link href={`/letters/${letter.id}`} className="btn-primary w-full justify-center">
              <Users size={15} />
              View & Contribute
              <ArrowRight size={14} />
            </Link>
          )}
          <Link href="/dashboard" className="btn-ghost w-full justify-center">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
