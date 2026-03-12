'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { lettersApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import RichEditor from '@/components/RichEditor';
import { Feather, Lock, Clock, Send, Tag, ChevronDown, Info, CheckCircle, Coins, Save, Check } from 'lucide-react';
import Link from 'next/link';
import { format, addYears } from 'date-fns';

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

const PROMPTS = [
  'Where are you right now in life? What feels uncertain?',
  'What do you hope to have accomplished by then?',
  'What are you most afraid of today? What do you hope will have changed?',
  'Describe your relationships. How do you hope they have evolved?',
  'What advice would you give yourself?',
  'What are you proud of today, even if no one else knows?',
  'What does success look like to you right now?',
  'Who do you want to become?',
];

const QUICK_DATES = [
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: '5 years', months: 60 },
  { label: '10 years', months: 120 },
  { label: '20 years', months: 240 },
  { label: '30 years', months: 360 },
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ComposePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    title: '',
    content: '',
    delivery_date: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
    recipient_email: '',
    recipient_name: '',
    mood: '',
    tags: [] as string[],
    lockOnSubmit: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [showPrompts, setShowPrompts] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const formRef = useRef(form);
  const draftIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  formRef.current = form;
  draftIdRef.current = draftId;

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (user) {
      setForm(prev => ({ ...prev, recipient_email: user.email, recipient_name: user.name }));
    }
  }, [user, authLoading]);

  // Load existing draft if ?draft=id in URL
  useEffect(() => {
    const id = searchParams.get('draft');
    if (id && user) {
      lettersApi.getOne(id).then(r => {
        const l = r.data.letter;
        setDraftId(l.id);
        draftIdRef.current = l.id;
        setForm(prev => ({
          ...prev,
          title: l.title || '',
          content: l.content || '',
          delivery_date: l.delivery_date || prev.delivery_date,
          recipient_email: l.recipient_email || prev.recipient_email,
          recipient_name: l.recipient_name || prev.recipient_name,
          mood: l.mood || '',
          tags: l.tags || [],
        }));
        const wc = (l.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
        setWordCount(wc);
      }).catch(() => {});
    }
  }, [searchParams, user]);

  const saveDraft = useCallback(async (force = false) => {
    const f = formRef.current;
    const hasContent = f.title.trim() || f.content.replace(/<[^>]*>/g, '').trim();
    if (!hasContent && !force) return;
    if (!isDirtyRef.current && !force) return;

    setSaveStatus('saving');
    try {
      const res = await lettersApi.saveDraft({
        id: draftIdRef.current,
        title: f.title || 'Untitled Draft',
        content: f.content,
        delivery_date: f.delivery_date,
        recipient_email: f.recipient_email,
        recipient_name: f.recipient_name,
        mood: f.mood,
        tags: f.tags,
      });
      const newId = res.data.id;
      setDraftId(newId);
      draftIdRef.current = newId;
      setSaveStatus('saved');
      setLastSaved(new Date());
      isDirtyRef.current = false;

      // Update URL without re-render
      if (!searchParams.get('draft') || searchParams.get('draft') !== newId) {
        window.history.replaceState({}, '', '/compose?draft=' + newId);
      }
    } catch (e) {
      setSaveStatus('error');
    }
  }, []);

  // Mark dirty on any form change
  useEffect(() => {
    isDirtyRef.current = true;
  }, [form]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      saveDraft();
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [saveDraft]);

  // Save on tab close / navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        const f = formRef.current;
        const hasContent = f.title.trim() || f.content.replace(/<[^>]*>/g, '').trim();
        if (hasContent) {
          // Use navigator.sendBeacon for reliable save on unload
          const data = JSON.stringify({
            id: draftIdRef.current,
            title: f.title || 'Untitled Draft',
            content: f.content,
            delivery_date: f.delivery_date,
            recipient_email: f.recipient_email,
            recipient_name: f.recipient_name,
            mood: f.mood,
            tags: f.tags,
          });
          const token = localStorage.getItem('token');
          navigator.sendBeacon
            ? navigator.sendBeacon('/api/letters/draft', new Blob([data], { type: 'application/json' }))
            : saveDraft(true);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveDraft]);

  const setQuickDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setForm(prev => ({ ...prev, delivery_date: format(d, 'yyyy-MM-dd') }));
  };

  const addTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (tag && !form.tags.includes(tag) && form.tags.length < 5) {
        setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setTagInput('');
    }
  };

  const usePrompt = (prompt: string) => {
    setForm(prev => ({
      ...prev,
      content: prev.content ? prev.content + '<p></p><p><em>' + prompt + '</em></p>' : '<p><em>' + prompt + '</em></p>'
    }));
    setShowPrompts(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Please add a title'); setStep(1); return; }
    const plainText = form.content.replace(/<[^>]*>/g, '').trim();
    if (!plainText || wordCount < 3) { setError('Please write at least a few words'); setStep(1); return; }
    if (!form.recipient_email) { setError('Recipient email is required'); setStep(2); return; }
    if (new Date(form.delivery_date) <= new Date()) { setError('Delivery date must be in the future'); setStep(2); return; }

    setLoading(true);
    try {
      if (draftId) {
        await lettersApi.publishDraft(draftId, {
          title: form.title,
          content: form.content,
          delivery_date: form.delivery_date,
          recipient_email: form.recipient_email,
          recipient_name: form.recipient_name,
          mood: form.mood,
          tags: form.tags,
          lock: form.lockOnSubmit,
        });
      } else {
        const res = await lettersApi.create({
          title: form.title,
          content: form.content,
          delivery_date: form.delivery_date,
          recipient_email: form.recipient_email,
          recipient_name: form.recipient_name,
          mood: form.mood,
          tags: form.tags,
        });
        if (form.lockOnSubmit) {
          await lettersApi.lock(res.data.letter.id);
        }
      }

      isDirtyRef.current = false;
      await refreshUser();
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule letter');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  if (user && (user.letter_credits ?? 0) < 1) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="card p-10 max-w-md w-full text-center mx-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <Coins size={28} className="text-red-400" />
            </div>
            <h2 className="font-display text-2xl text-parchment mb-2">No credits remaining</h2>
            <div className="gold-divider my-4" />
            <p className="text-parchment/50 font-sans text-sm leading-relaxed mb-6">
              You can still save drafts for free. Purchase credits when you are ready to schedule delivery.
            </p>
            <div className="space-y-3">
              <Link href="/pricing" className="btn-primary w-full justify-center">
                <Coins size={15} />Buy Letter Credits
              </Link>
              <Link href="/dashboard" className="btn-ghost w-full justify-center">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center fade-up">
          <div className="text-8xl mb-6">📬</div>
          <h2 className="font-display text-4xl text-parchment mb-3">Letter Sealed!</h2>
          <div className="gold-divider mb-4" />
          <p className="text-parchment/50 font-sans">Your letter has been encrypted and scheduled for delivery.</p>
          <p className="text-parchment/30 font-sans text-sm mt-2">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  const deliveryDateDisplay = form.delivery_date
    ? new Date(form.delivery_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const SaveIndicator = () => (
    <div className="flex items-center gap-1.5 text-xs font-sans">
      {saveStatus === 'saving' && (
        <><div className="w-3 h-3 border border-parchment/30 border-t-transparent rounded-full animate-spin" /><span className="text-parchment/30">Saving draft...</span></>
      )}
      {saveStatus === 'saved' && (
        <><Check size={12} className="text-emerald-400" /><span className="text-parchment/30">Draft saved {lastSaved ? lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span></>
      )}
      {saveStatus === 'error' && (
        <span className="text-red-400/60">Could not save draft</span>
      )}
      {saveStatus === 'idle' && draftId && (
        <><Save size={11} className="text-parchment/20" /><span className="text-parchment/20">Draft</span></>
      )}
    </div>
  );

  const steps = [{ n: 1, label: 'Write' }, { n: 2, label: 'Details' }, { n: 3, label: 'Review' }];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">

          <div className="text-center mb-8">
            <span className="section-label">Write a letter</span>
            <h1 className="font-display text-4xl text-parchment mt-3 mb-2 font-light">Seal your words in time</h1>
            <div className="gold-divider mt-3" />
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-0">
              {steps.map(({ n, label }, i) => (
                <div key={n} className="flex items-center">
                  <button
                    onClick={() => (n < step || step === 3) ? setStep(n) : null}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-all ${
                      step === n ? 'bg-gold/10 text-gold border border-gold/20' :
                      n < step ? 'text-emerald-400/70 hover:text-emerald-400 cursor-pointer' :
                      'text-parchment/30 cursor-not-allowed'
                    }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${
                      step === n ? 'border-gold bg-gold/20 text-gold' :
                      n < step ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' :
                      'border-[#2a2a3e] text-parchment/30'
                    }`}>{n < step ? '✓' : n}</div>
                    {label}
                  </button>
                  {i < steps.length - 1 && <div className={`w-8 h-px mx-1 ${n < step ? 'bg-emerald-500/30' : 'bg-[#2a2a3e]'}`} />}
                </div>
              ))}
            </div>
            <SaveIndicator />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm font-sans">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-5 fade-in">
              <div className="card p-6">
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-3">Letter Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  onBlur={() => saveDraft()}
                  className="w-full bg-transparent border-none outline-none font-display text-2xl text-parchment placeholder-parchment/20"
                  placeholder="Dear Future Me, on my 30th birthday..."
                />
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs text-parchment/50 font-sans tracking-wider uppercase">Your Letter</label>
                  <div className="flex items-center gap-3">
                    <span className="text-parchment/30 text-xs font-sans">{wordCount} words</span>
                    <button onClick={() => setShowPrompts(!showPrompts)} className="flex items-center gap-1.5 text-xs text-gold/60 hover:text-gold transition-colors font-sans">
                      <Feather size={13} />Prompts
                      <ChevronDown size={13} className={`transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {showPrompts && (
                  <div className="mb-5 p-4 bg-[#0d0d14] rounded-xl border border-[#2a2a3e] space-y-2">
                    <p className="text-xs text-parchment/30 font-sans mb-3">Click a prompt to add it to your letter:</p>
                    {PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => usePrompt(p)} className="text-left text-sm text-parchment/50 hover:text-parchment font-sans p-2 rounded-lg hover:bg-white/5 transition-all block w-full">
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                <RichEditor
                  content={form.content}
                  onChange={(html, text) => {
                    setForm(prev => ({ ...prev, content: html }));
                    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
                  }}
                  placeholder="Start writing... Pour your heart out. No one can read this but your future self."
                />

                {wordCount > 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#2a2a3e]">
                    <div className="flex-1 h-0.5 bg-[#2a2a3e] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold/40 to-gold transition-all duration-500" style={{ width: `${Math.min((wordCount / 500) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs text-parchment/30 font-sans whitespace-nowrap">
                      {wordCount < 50 ? 'Keep going...' : wordCount < 200 ? 'Getting deeper...' : wordCount < 500 ? 'This is beautiful' : 'A true masterwork'}
                    </span>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-4">How are you feeling right now?</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(({ emoji, label }) => (
                    <button key={label} onClick={() => setForm(prev => ({ ...prev, mood: prev.mood === label ? '' : label }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-sans transition-all ${
                        form.mood === label ? 'bg-gold/15 border-gold/40 text-parchment' : 'border-[#2a2a3e] text-parchment/50 hover:border-[#3a3a4e] hover:text-parchment/80'
                      }`}>
                      <span>{emoji}</span>{label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button onClick={() => saveDraft(true)} className="btn-ghost flex items-center gap-2 text-sm">
                  <Save size={14} />Save Draft
                </button>
                <button onClick={() => {
                  if (!form.title.trim()) { setError('Please add a title first'); return; }
                  const plain = form.content.replace(/<[^>]*>/g, '').trim();
                  if (!plain) { setError('Please write your letter first'); return; }
                  setError('');
                  saveDraft();
                  setStep(2);
                }} className="btn-primary">
                  Continue to Details
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 fade-in">
              <div className="card p-6">
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-4">
                  <Clock size={13} className="inline mr-1.5" />Delivery Date
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK_DATES.map(({ label, months }) => (
                    <button key={label} onClick={() => setQuickDate(months)} className="px-3 py-1.5 rounded-lg border border-[#2a2a3e] text-sm text-parchment/50 hover:border-gold/30 hover:text-gold transition-all font-sans">
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={form.delivery_date}
                  min={format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')}
                  onChange={e => setForm(prev => ({ ...prev, delivery_date: e.target.value }))}
                  className="input-field"
                />
                {form.delivery_date && (
                  <p className="text-parchment/40 text-sm font-sans mt-2">
                    Your letter will arrive on <strong className="text-gold">{deliveryDateDisplay}</strong>
                  </p>
                )}
              </div>

              <div className="card p-6">
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-4">
                  <Send size={13} className="inline mr-1.5" />Recipient
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-parchment/30 font-sans mb-1.5">Recipient Name</label>
                    <input type="text" value={form.recipient_name} onChange={e => setForm(prev => ({ ...prev, recipient_name: e.target.value }))} className="input-field" placeholder="Future Me" />
                  </div>
                  <div>
                    <label className="block text-xs text-parchment/30 font-sans mb-1.5">Delivery Email</label>
                    <input type="email" value={form.recipient_email} onChange={e => setForm(prev => ({ ...prev, recipient_email: e.target.value }))} className="input-field" placeholder="email@example.com" required />
                    <p className="text-parchment/30 text-xs font-sans mt-1.5">This is where your letter will be delivered on the scheduled date.</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <label className="block text-xs text-parchment/50 font-sans tracking-wider uppercase mb-4">
                  <Tag size={13} className="inline mr-1.5" />Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-sm font-sans">
                      #{tag}
                      <button onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} className="text-gold/50 hover:text-gold">x</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} className="input-field" placeholder="Type a tag and press Enter" disabled={form.tags.length >= 5} />
                <p className="text-parchment/20 text-xs font-sans mt-1.5">{form.tags.length}/5 tags</p>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                <button onClick={() => {
                  if (!form.recipient_email) { setError('Recipient email is required'); return; }
                  setError('');
                  saveDraft();
                  setStep(3);
                }} className="btn-primary">Review Letter</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 fade-in">
              <div className="card p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="section-label mb-1">Letter Preview</p>
                    <h2 className="font-display text-3xl text-parchment font-light">{form.title}</h2>
                  </div>
                  {form.mood && <div className="text-3xl">{MOODS.find(m => m.label === form.mood)?.emoji}</div>}
                </div>

                <div className="border-t border-[#2a2a3e] pt-6 mb-6">
                  <div className="letter-content max-h-64 overflow-y-auto prose-review" dangerouslySetInnerHTML={{ __html: form.content }} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Delivery Date', value: form.delivery_date ? new Date(form.delivery_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set' },
                    { label: 'Recipient', value: form.recipient_name || 'You' },
                    { label: 'Word Count', value: wordCount + ' words' },
                    { label: 'Mood', value: form.mood || 'Not set' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#0d0d14] rounded-xl p-3">
                      <p className="text-parchment/30 text-xs font-sans mb-1">{label}</p>
                      <p className="text-parchment text-sm font-sans font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {form.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-[#0d0d14] border border-[#2a2a3e] text-parchment/40 font-sans">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className={`card p-6 border transition-all ${form.lockOnSubmit ? 'border-gold/30 bg-gold/5' : ''}`}>
                <button onClick={() => setForm(prev => ({ ...prev, lockOnSubmit: !prev.lockOnSubmit }))} className="flex items-start gap-4 w-full text-left">
                  <div className={`w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-all flex-shrink-0 ${form.lockOnSubmit ? 'border-gold bg-gold' : 'border-[#3a3a4e]'}`}>
                    {form.lockOnSubmit && <CheckCircle size={12} className="text-void-700" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock size={15} className={form.lockOnSubmit ? 'text-gold' : 'text-parchment/50'} />
                      <span className={`font-sans font-semibold text-sm ${form.lockOnSubmit ? 'text-gold' : 'text-parchment'}`}>Seal this letter permanently</span>
                    </div>
                    <p className="text-parchment/40 text-sm font-sans leading-relaxed">Once sealed, this letter cannot be edited or deleted. Your words, frozen in time forever.</p>
                  </div>
                </button>
              </div>

              <div className="bg-gold/5 border border-gold/15 rounded-xl p-4 flex items-start gap-3">
                <Info size={15} className="text-gold/60 mt-0.5 flex-shrink-0" />
                <p className="text-parchment/50 text-sm font-sans leading-relaxed">
                  Your letter will be encrypted before storage. On delivery day, it will be sent to <strong className="text-parchment/70">{form.recipient_email}</strong>. This uses 1 credit.
                </p>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
                <button onClick={handleSubmit} className="btn-primary px-8" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sealing your letter...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {form.lockOnSubmit ? <Lock size={16} /> : <Send size={16} />}
                      {form.lockOnSubmit ? 'Seal and Schedule' : 'Schedule Delivery'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
