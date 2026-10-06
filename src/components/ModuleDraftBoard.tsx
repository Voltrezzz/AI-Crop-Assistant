import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { saveModuleDraft, type ModuleDraftKind } from '@/services/moduleDraftService';

export default function ModuleDraftBoard({ kind, title, withDate = false }: { kind: ModuleDraftKind; title: string; withDate?: boolean }) {
  const userId = useAuthStore(s => s.user?.id);
  const drafts = useLiveQuery(() => userId ? db.moduleDrafts.where('userId').equals(userId).filter(d => d.kind === kind).reverse().toArray() : [], [userId, kind]);
  const [subject, setSubject] = useState(''), [detail, setDetail] = useState(''), [date, setDate] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy || !userId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await saveModuleDraft({ userId, kind, title: subject, detail, neededDate: date || undefined });
      setSubject(''); setDetail(''); setDate(''); setNotice('Saved on this device. Nothing has been sent.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-4">
    <h2 className="text-lg font-bold">{title}</h2>
    <p className="text-sm text-gray-600 dark:text-slate-300">Drafts stay with your account in this browser and survive reloads. They are not published or sent to providers.</p>
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">Title<input className="input-field mt-1" value={subject} onChange={e => setSubject(e.target.value)} required maxLength={120} /></label>
      <label className="block text-sm">Details<textarea className="input-field mt-1" rows={3} value={detail} onChange={e => setDetail(e.target.value)} required maxLength={4000} /></label>
      {withDate && <label className="block text-sm">Requested date (optional)<input className="input-field mt-1" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>}
      <button className="btn-primary" disabled={busy || !userId}>{busy ? 'Saving…' : 'Save local draft'}</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    <h3 className="font-semibold">Saved drafts</h3>
    {drafts === undefined ? <p>Loading…</p> : drafts.length === 0 ? <p className="text-sm text-gray-500">No saved drafts yet.</p> : drafts.map(d => <article key={d.id} className="border-t border-gray-200 pt-3 dark:border-slate-700">
      <h4 className="font-semibold break-words">{d.title}</h4><p className="whitespace-pre-wrap break-words text-sm mt-1">{d.detail}</p>
      <p className="text-xs text-gray-500 mt-2">Saved {new Date(d.createdAt).toLocaleDateString()}{d.neededDate && ` · Requested ${d.neededDate}`}</p>
    </article>)}
  </section>;
}
