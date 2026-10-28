import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, X, Check, Sparkles } from 'lucide-react';
import { EXPENSE_CATEGORIES, formatMoney, toISODate, debtBalance } from '../lib/store.js';
import { parseDictation } from '../lib/parseDictation.js';

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

const emptyForm = () => ({
  kind: 'expense',
  debtMode: 'new',
  debtId: '',
  name: '',
  amount: '',
  category: 'Other',
  frequency: 'one-time',
  date: toISODate(),
  optional: false,
  balance: '',
  original: '',
  minPayment: '',
  extraPayment: '',
  apr: '',
});

/** Browser speech-to-text (Chrome, Edge, Safari incl. iPhone). Calls onFinal with the finished sentence. */
function useSpeechToText(onFinal) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    recRef.current?.abort();
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';

    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInterim(text);
      if (e.results[e.results.length - 1].isFinal) finalText = text;
    };
    rec.onerror = (e) => {
      const messages = {
        'not-allowed': 'Microphone access is blocked. Allow it in your browser settings and try again.',
        'service-not-allowed': 'Speech recognition is turned off on this device.',
        'no-speech': "Didn't catch that — tap the mic and try again.",
        network: 'Speech recognition needs an internet connection.',
        aborted: '',
      };
      setError(messages[e.error] ?? `Speech recognition error: ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) onFinalRef.current(finalText.trim());
    };

    recRef.current = rec;
    setError('');
    setInterim('');
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported: Boolean(SpeechRecognition), listening, interim, error, start, stop };
}

export default function AddEntrySheet({ entries, onSave, onClose, autoListen = false }) {
  const debts = entries.filter((e) => e.kind === 'debt');
  const [form, setForm] = useState(emptyForm);
  const [transcript, setTranscript] = useState('');
  const [hint, setHint] = useState('');
  const [formError, setFormError] = useState('');

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const applyText = useCallback(
    (text) => {
      if (!text.trim()) return;
      const parsed = parseDictation(text, debts);
      setForm((f) => ({ ...emptyForm(), ...parsed, optional: f.optional && parsed.kind === 'income' }));
      setHint(parsed.hint || 'Filled in from what you said — check it, then tap Save.');
      setFormError('');
    },
    [debts],
  );

  const speech = useSpeechToText((text) => {
    setTranscript(text);
    applyText(text);
  });

  useEffect(() => {
    if (autoListen && speech.supported) speech.start();
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

  function handleSave(e) {
    e.preventDefault();
    const f = form;
    let entry;

    if (f.kind === 'debt' && f.debtMode === 'payment') {
      const debt = debts.find((d) => d.id === f.debtId);
      if (!debt) return setFormError('Pick which debt this payment is for.');
      if (!(num(f.amount) > 0)) return setFormError('Enter the payment amount.');
      entry = { kind: 'payment', debtId: debt.id, name: `Payment · ${debt.name}`, amount: num(f.amount), date: f.date };
    } else if (f.kind === 'debt') {
      if (!f.name.trim()) return setFormError('Give the debt a name (e.g. "Credit Card").');
      if (!(num(f.balance) > 0)) return setFormError('Enter how much you currently owe.');
      const balance = num(f.balance);
      entry = {
        kind: 'debt',
        name: f.name.trim(),
        balance,
        original: num(f.original) > 0 ? Math.max(num(f.original), balance) : balance,
        minPayment: num(f.minPayment) > 0 ? num(f.minPayment) : 0,
        extraPayment: num(f.extraPayment) > 0 ? num(f.extraPayment) : 0,
        apr: num(f.apr) >= 0 ? num(f.apr) : null,
        date: f.date,
      };
    } else {
      if (!f.name.trim()) return setFormError('Add a short description.');
      if (!(num(f.amount) > 0)) return setFormError('Enter an amount greater than $0.');
      entry = {
        kind: f.kind,
        name: f.name.trim(),
        amount: num(f.amount),
        frequency: f.frequency,
        date: f.date,
        ...(f.kind === 'expense' ? { category: f.category } : { optional: f.frequency === 'monthly' && f.optional }),
      };
    }

    onSave(entry);
  }

  const isPayment = form.kind === 'debt' && form.debtMode === 'payment';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Add entry"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-zinc-900/90 backdrop-blur-2xl border border-white/15 shadow-2xl p-5 pb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Entry</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X size={18} />
          </button>
        </div>

        {/* Dictation */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-5">
          <div className="flex items-center gap-3">
            {speech.supported && (
              <button
                type="button"
                onClick={speech.listening ? speech.stop : speech.start}
                aria-label={speech.listening ? 'Stop listening' : 'Start dictation'}
                className={`relative shrink-0 h-14 w-14 rounded-full flex items-center justify-center transition-colors ${
                  speech.listening ? 'bg-red-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                {speech.listening && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />}
                {speech.listening ? <MicOff size={22} className="relative" /> : <Mic size={22} />}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200">
                {speech.listening ? 'Listening…' : speech.supported ? 'Tap the mic and say it' : 'Type or dictate it'}
              </p>
              <p className="text-xs text-gray-500 leading-snug">
                e.g. “Spent $45 at Chipotle”, “Got paid 2,700 every two weeks”, “Paid 300 toward the Kia”
              </p>
            </div>
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyText(transcript);
            }}
          >
            <input
              value={speech.listening ? speech.interim : transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={speech.supported ? 'Or type it here…' : 'Type here, or use your keyboard’s mic…'}
              className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/60"
            />
            <button
              type="submit"
              disabled={!transcript.trim() || speech.listening}
              className="shrink-0 px-3 rounded-xl bg-white/10 border border-white/10 text-sm font-medium disabled:opacity-40 flex items-center gap-1"
            >
              <Sparkles size={14} /> Fill
            </button>
          </form>

          {speech.error && <p className="mt-2 text-xs text-red-400">{speech.error}</p>}
          {hint && !speech.error && <p className="mt-2 text-xs text-blue-300">{hint}</p>}
        </div>

        {/* Manual form */}
        <form onSubmit={handleSave} className="space-y-4">
          <Segmented
            value={form.kind}
            onChange={(kind) => setForm((f) => ({ ...f, kind }))}
            options={[
              ['expense', 'Expense'],
              ['income', 'Income'],
              ['debt', 'Debt'],
            ]}
          />

          {form.kind === 'debt' && debts.length > 0 && (
            <Segmented
              small
              value={form.debtMode}
              onChange={(debtMode) =>
                setForm((f) => ({ ...f, debtMode, debtId: f.debtId || debts[0]?.id || '' }))
              }
              options={[
                ['new', 'New debt'],
                ['payment', 'Log a payment'],
              ]}
            />
          )}

          {isPayment ? (
            <>
              <Field label="Debt">
                <select value={form.debtId} onChange={set('debtId')} className={inputCls}>
                  <option value="" disabled>
                    Choose a debt…
                  </option>
                  {debts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {formatMoney(debtBalance(d, entries))} left
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment amount">
                <MoneyInput value={form.amount} onChange={set('amount')} />
              </Field>
            </>
          ) : form.kind === 'debt' ? (
            <>
              <Field label="Name">
                <input value={form.name} onChange={set('name')} placeholder="Credit Card, Student Loan…" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount owed now">
                  <MoneyInput value={form.balance} onChange={set('balance')} />
                </Field>
                <Field label="Original amount" optional>
                  <MoneyInput value={form.original} onChange={set('original')} />
                </Field>
                <Field label="Minimum / month" optional>
                  <MoneyInput value={form.minPayment} onChange={set('minPayment')} />
                </Field>
                <Field label="Extra / month" optional>
                  <MoneyInput value={form.extraPayment} onChange={set('extraPayment')} />
                </Field>
              </div>
              <Field label="Interest rate (APR %)" optional>
                <input type="number" inputMode="decimal" step="0.01" min="0" value={form.apr ?? ''} onChange={set('apr')} placeholder="e.g. 22.9" className={inputCls} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Description">
                <input
                  value={form.name}
                  onChange={set('name')}
                  placeholder={form.kind === 'income' ? 'Paycheck, Freelance…' : 'Chipotle, Netflix…'}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount">
                  <MoneyInput value={form.amount} onChange={set('amount')} />
                </Field>
                <Field label="How often">
                  <select value={form.frequency} onChange={set('frequency')} className={inputCls}>
                    <option value="one-time">One-time</option>
                    <option value="monthly">Every month</option>
                  </select>
                </Field>
              </div>
              {form.kind === 'expense' && (
                <Field label="Category">
                  <select value={form.category} onChange={set('category')} className={inputCls}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              )}
              {form.kind === 'income' && form.frequency === 'monthly' && (
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.optional} onChange={set('optional')} className="h-4 w-4 accent-green-500" />
                  Not guaranteed (like a bonus) — only count it when “Include bonus” is on
                </label>
              )}
            </>
          )}

          <Field label="Date">
            <input type="date" value={form.date} onChange={set('date')} className={inputCls} />
          </Field>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Check size={18} /> Save
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

const inputCls =
  'w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/60 [color-scheme:dark]';

function Field({ label, optional, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-gray-400">
        {label} {optional && <span className="text-gray-600">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

function MoneyInput({ value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value ?? ''}
        onChange={onChange}
        placeholder="0.00"
        className={`${inputCls} pl-7`}
      />
    </div>
  );
}

function Segmented({ value, onChange, options, small }) {
  return (
    <div className="flex bg-white/10 p-1 rounded-2xl border border-white/10">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-xl font-medium transition-colors ${small ? 'py-1.5 text-xs' : 'py-2 text-sm'} ${
            value === key ? 'bg-white/20 text-white' : 'text-gray-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

