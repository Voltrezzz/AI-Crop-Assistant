import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Sprout, Satellite, WifiOff, BookOpen, Tractor, Package, IndianRupee, FolderLock, Users, Recycle, Download } from 'lucide-react';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { sihModules } from '@/data/sihModules';

const icons = { Sprout, Satellite, WifiOff, BookOpen, Tractor, Package, IndianRupee, FolderLock, Users, Recycle };
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Marudham360Page({ moduleName }: { moduleName?: string }) {
  const { module: routeModule } = useParams();
  const module = moduleName || routeModule;
  const userId = useAuthStore(s => s.user?.id);
  const [fieldFilter, setFieldFilter] = useState('all');
  const [online, setOnline] = useState(navigator.onLine);
  const records = useLiveQuery(async () => {
    if (!userId) return null;
    const [fields, cycles, activities, scans, inventory, sales, observations, fertilizers, pesticides, irrigation, growth, production] = await Promise.all([
      db.fields.where('userId').equals(userId).toArray(), db.cropCycles.where('userId').equals(userId).toArray(),
      db.farmActivities.where('userId').equals(userId).toArray(), db.scans.where('userId').equals(userId).toArray(),
      db.inventoryBatches.where('userId').equals(userId).toArray(), db.salesRecords.where('userId').equals(userId).toArray(),
      db.observations.where('userId').equals(userId).toArray(), db.fertilizerRecords.where('userId').equals(userId).toArray(),
      db.pesticideRecords.where('userId').equals(userId).toArray(), db.irrigationRecords.where('userId').equals(userId).toArray(),
      db.growthRecords.where('userId').equals(userId).toArray(), db.productionRecords.where('userId').equals(userId).toArray(),
    ]);
    return { fields, cycles, activities, scans, inventory, sales, observations, fertilizers, pesticides, irrigation, growth, production };
  }, [userId]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const fieldName = (id?: number) => records?.fields.find(f => f.id === id)?.name || 'Unassigned field';
  const revenue = records?.sales.reduce((total, s) => total + s.totalRevenue, 0) || 0;
  const activityCosts = records?.activities.reduce((total, a) => total + (a.cost || 0), 0) || 0;
  const timeline = records ? [
    ...records.cycles.map(c => ({ key: `cycle-${c.id}`, fieldId: c.fieldId, date: c.startDate, title: `${c.crop} cycle started`, detail: `${c.variety} · ${c.status}` })),
    ...records.activities.map(a => ({ key: `activity-${a.id}`, fieldId: a.fieldId, date: a.date, title: a.title, detail: `${a.description || a.type}${a.cost ? ` · ${money(a.cost)}` : ''}` })),
    ...records.scans.map(s => ({ key: `scan-${s.id}`, fieldId: s.fieldId, date: s.date, title: 'Crop scan', detail: s.diseaseName })),
    ...records.observations.map(o => ({ key: `observation-${o.id}`, fieldId: o.fieldId, date: o.date, title: 'Field observation', detail: o.note })),
    ...records.fertilizers.map(f => ({ key: `fertilizer-${f.id}`, fieldId: f.fieldId, date: f.date, title: 'Fertilizer record', detail: `${f.fertilizerType} · ${f.quantityKg} kg` })),
    ...records.pesticides.map(p => ({ key: `pesticide-${p.id}`, fieldId: p.fieldId, date: p.date, title: 'Pesticide record', detail: `${p.pesticideName} · ${p.quantityLiters} litres` })),
    ...records.irrigation.map(i => ({ key: `irrigation-${i.id}`, fieldId: i.fieldId, date: i.date, title: 'Irrigation estimate', detail: `${i.waterRequirementLiters} litres · ${i.irrigationDurationMinutes} minutes (calculated estimate)` })),
    ...records.growth.map(g => ({ key: `growth-${g.id}`, fieldId: g.fieldId, date: g.date, title: `Growth: ${g.stage.replace(/_/g, ' ')}`, detail: g.notes })),
    ...records.production.map(p => ({ key: `production-${p.id}`, fieldId: p.fieldId, date: p.date, title: 'Production record', detail: `${p.quantityKg} kg · ${p.quality || 'Ungraded'}` })),
    ...records.inventory.map(b => ({ key: `harvest-${b.id}`, fieldId: b.fieldId, date: b.harvestDate, title: 'Harvest recorded', detail: `${b.quantity} ${b.quantityUnit} · ${b.qualityGrade} · ${b.status}` })),
    ...records.sales.map(s => ({ key: `sale-${s.id}`, fieldId: records.inventory.find(b => b.id === s.inventoryBatchId)?.fieldId, date: s.saleDate, title: 'Sale recorded', detail: money(s.totalRevenue) })),
  ].filter(e => fieldFilter === 'all' || e.fieldId === Number(fieldFilter)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)) : [];
  function exportMemory() {
    if (!records) return;
    const output = { exportedAt: new Date().toISOString(), field: fieldFilter, events: timeline };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'marudham360-farm-memory.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const title = ({ health: 'Health & Alerts', memory: 'Digital Farm Memory', offline: 'Offline & Voice', 'post-harvest': 'Post-Harvest', finance: 'Market & Finance' } as Record<string, string>)[module || ''];
  const action = (to: string, label: string) => <Link key={to} className="btn-secondary inline-flex items-center justify-center gap-2" to={to}>{label}<ArrowRight size={16} /></Link>;
  return <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-28 space-y-6">
    <header className="rounded-2xl bg-green-950 text-white p-6 lg:p-8">
      <Link to="/marudham360" className="text-green-200 text-sm font-medium">MARUDHAM 360</Link>
      <h1 className="text-3xl font-bold mt-3">{title || 'Your complete farming journey'}</h1>
      <p className="mt-3 max-w-2xl text-green-100">{module ? 'Use your saved farm records and the connected tools below.' : 'Ten modules, from land and soil planning to harvest, income and rural enterprise.'}</p>
    </header>
    {!module && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Fields', records?.fields.length ?? '—'], ['Crop cycles', records?.cycles.length ?? '—'], ['Recorded revenue', records ? money(revenue) : '—']].map(([label, value]) => <div key={label} className="card"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold mt-2">{value}</p></div>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{sihModules.map((m, i) => {
        const Icon = icons[m.icon];
        return <Link key={m.id} to={m.path} className="card hover:border-green-500 transition-colors flex flex-col gap-3 focus-visible:ring-2 focus-visible:ring-green-600">
          <div className="flex items-center justify-between"><Icon size={28} className="text-green-700 dark:text-green-400" /><span className="text-xs text-gray-400">{String(i + 1).padStart(2, '0')}</span></div>
          <h2 className="text-lg font-bold">{m.title}</h2><p className="text-sm text-gray-600 dark:text-slate-300">{m.description}</p>
          <p className="text-xs text-green-800 dark:text-green-300 mt-auto">{m.status}</p><span className="text-sm font-semibold inline-flex items-center gap-2">Open module <ArrowRight size={15} /></span>
        </Link>;
      })}</div>
      <section className="card"><h2 className="font-bold mb-3">Start a season</h2><div className="flex flex-wrap gap-3">{action('/fields/new', '1. Add land')}{action('/crop-plan', '2. Plan a crop')}{action('/add-activity', '3. Record cultivation')}{action('/post-harvest', '4. Harvest and sell')}</div></section>
    </>}
    {module === 'health' && <>
      <div className="flex flex-wrap gap-3">{action('/satellite', 'Satellite monitoring')}{action('/analyzer', 'Scan crop')}{action('/insect-bite', 'Pest advisory')}{action('/weather', 'Weather')}{action('/risk', 'Disease risk')}{action('/community', 'Prepare expert request')}</div>
      <section className="card space-y-3"><h2 className="text-lg font-bold">Field satellite maps</h2><p className="text-sm text-gray-600">Import a field boundary and search dated Sentinel-2 scenes in Satellite Monitoring.</p>{records?.fields.length === 0 && <p>Add a field to open its map.</p>}{records?.fields.map(f => <Link key={f.id} className="block p-3 border rounded-lg dark:border-slate-700 hover:border-green-500" to={`/fields/${f.id}/satellite`}>{f.name} · {f.crop}<span className="float-right">Open map →</span></Link>)}</section>
      <section className="card space-y-3"><h2 className="text-lg font-bold">Recent scan records</h2><p className="text-sm text-gray-600">Model results need field confirmation; these are saved records, not live monitoring alerts.</p>{records?.scans.length === 0 && <p>No scan records yet.</p>}{records?.scans.slice().sort((a,b) => Date.parse(b.date)-Date.parse(a.date)).slice(0,8).map(s => <Link key={s.id} className="block border-t pt-3" to={`/history/${s.id}`}>{s.diseaseName} · {fieldName(s.fieldId)} · {new Date(s.date).toLocaleDateString()}</Link>)}</section>
    </>}
    {module === 'memory' && <>
      <section className="card space-y-4"><div className="flex flex-wrap items-end gap-3"><label className="text-sm">Field<select className="input-field mt-1" value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}><option value="all">All fields</option>{records?.fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button disabled={!records} onClick={exportMemory} className="btn-secondary inline-flex gap-2 items-center"><Download size={17} /> Export timeline</button>{action('/add-activity', 'Add activity')}</div>
      {!records ? <p>Loading farm memory…</p> : timeline.length === 0 ? <p>No records for this field yet. Start a crop cycle or add an activity.</p> : <ol className="space-y-4">{timeline.map(e => <li key={e.key} className="border-l-2 border-green-500 pl-4"><p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()} · {fieldName(e.fieldId)}</p><h2 className="font-semibold mt-1">{e.title}</h2><p className="text-sm whitespace-pre-wrap break-words">{e.detail}</p></li>)}</ol>}</section>
    </>}
    {module === 'post-harvest' && <>
      <p className="bg-amber-50 text-amber-900 p-4 rounded-xl">Quality grades are manual entries. Computer-vision grading, buyer matching and storage sensors are not connected.</p>
      <section className="card space-y-3"><h2 className="font-bold text-lg">Crop cycles</h2>{records?.cycles.length === 0 && <p>No crop cycles yet. <Link className="text-green-700 underline" to="/crop-plan">Start a plan</Link> to record a harvest.</p>}{records?.cycles.map(c => <Link key={c.id} className="block p-4 border rounded-lg dark:border-slate-700" to={`/harvest/${c.id}`}>{fieldName(c.fieldId)} · {c.variety} <span className="text-sm text-green-700">{c.status} · Open harvest →</span></Link>)}</section>
      <section className="card space-y-3"><h2 className="font-bold text-lg">Inventory</h2>{records?.inventory.length === 0 && <p>No harvest batches recorded.</p>}{records?.inventory.map(b => <article key={b.id} className="border-t pt-3"><h3 className="font-semibold">{b.crop} · {b.variety}</h3><p>{b.quantity} {b.quantityUnit} · {b.qualityGrade} · {b.status}</p>{b.cropCycleId && <Link className="text-green-700 underline text-sm" to={`/harvest/${b.cropCycleId}`}>View harvest and sale</Link>}</article>)}</section>
    </>}
    {module === 'finance' && <>
      <div className="grid sm:grid-cols-3 gap-4">{[['Recorded revenue', revenue], ['Recorded activity costs', activityCosts], ['Revenue minus activity costs', revenue-activityCosts]].map(([label,n]) => <div key={label} className="card"><p className="text-sm">{label}</p><p className="text-2xl font-bold mt-3">{money(Number(n))}</p></div>)}</div>
      <p className="text-sm text-gray-600">Totals cover this account's saved sales and farm activities. Missing expenses, unsold stock and other input records are not included, so the difference is not net profit.</p>
      <div className="flex flex-wrap gap-3">{action('/market', 'Market analysis')}{action('/loans', 'Loans and schemes')}{action('/documents', 'Finance documents')}{action('/post-harvest', 'Record a sale')}</div>
    </>}
    {module === 'offline' && <>
      <section className="card space-y-4"><h2 className="font-bold text-lg">This browser</h2><p>Connection: <strong>{online ? 'Online' : 'Offline'}</strong></p><p>Offline app controller: <strong>{navigator.serviceWorker?.controller ? 'Active' : 'Not active on this page'}</strong></p><p>Local field records: <strong>{records?.fields.length ?? 'Loading…'}</strong></p>
      <p className="text-sm text-gray-600">Records are stored in IndexedDB. The production app caches its pages and bundled crop model after the service worker finishes installing. First load needs internet. A controller alone does not prove every asset is cached.</p>
      <p className="text-sm text-gray-600">Browser speech recognition may require internet and microphone access. Tamil and English fixed phrases can be spoken or typed. Other regional speech locales are selectable, but their phrases are not matched. Manual buttons and typed commands work without speech.</p>
      <p className="text-sm text-gray-600">Maps, external fonts, live APIs, cloud sign-in and translation are not guaranteed offline. Keep a backup before clearing browser data.</p>
      <div className="flex flex-wrap gap-3">{action('/voice', 'Open voice commands')}{action('/settings', 'Sync and language settings')}{action('/farm-memory', 'Export farm memory')}{action('/analyzer', 'Open local crop model')}</div></section>
    </>}
    {module && !title && <section className="card"><p>Module unavailable.</p><Link className="underline" to="/marudham360">View all ten modules</Link></section>}
    {module && records === undefined && <p role="status">Loading your saved records…</p>}
  </div>;
}
