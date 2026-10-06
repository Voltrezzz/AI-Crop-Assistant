import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { saveHarvest, recordHarvestSale } from '@/services/harvestService';
import type { CropCycle, InventoryBatch, SaleRecord } from '@/types';

export default function HarvestJourneyPage() {
  const { id } = useParams();
  const userId = useAuthStore(s => s.user?.id);
  const [cycle, setCycle] = useState<CropCycle>();
  const [batch, setBatch] = useState<InventoryBatch>();
  const [sale, setSale] = useState<SaleRecord>();
  const [fieldName, setFieldName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [grade, setGrade] = useState('Ungraded');
  const [price, setPrice] = useState('');
  const [costs, setCosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!userId) throw new Error('Sign in to view this harvest.');
        const c = await db.cropCycles.get(Number(id));
        const field = c && await db.fields.get(c.fieldId);
        if (!c || c.userId !== userId || field?.userId !== userId) throw new Error('Crop cycle unavailable.');
        const b = await db.inventoryBatches.where('cropCycleId').equals(Number(id)).filter(v => v.userId === userId).first();
        const s = b?.id ? await db.salesRecords.where('inventoryBatchId').equals(b.id).filter(v => v.userId === userId).first() : undefined;
        const activities = await db.farmActivities.where('cropCycleId').equals(Number(id)).filter(v => v.userId === userId).toArray();
        if (!cancelled) {
          setCycle(c); setFieldName(field.name); setBatch(b); setSale(s);
          setCosts(activities.reduce((sum, a) => sum + (Number.isFinite(a.cost) ? a.cost! : 0), 0));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load harvest.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id, userId]);

  async function save(kind: 'inventory' | 'sale') {
    if (busy || !userId || !cycle?.id) return;
    setBusy(true); setError('');
    try {
      if (kind === 'inventory') setBatch(await saveHarvest(userId, cycle.id, Number(quantity), grade));
      else if (batch?.id) setSale(await recordHarvestSale(userId, batch.id, Number(price)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="p-8">Loading harvest…</p>;
  return <main className="max-w-3xl mx-auto p-6 pb-28 space-y-6">
    <Link className="text-green-700" to="/fields">Back to fields</Link>
    <h1 className="text-2xl font-bold">Harvest &amp; Sale Journey</h1>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl">{error}</p>}
    {cycle && <>
      <p>{fieldName} · {cycle.crop}</p>
      <p className="bg-amber-50 text-amber-900 p-4 rounded-xl">Keep a local harvest and sale record. Grades are entered manually. Buyer matching, live prices and automated produce grading are not connected. Cloud changes are queued for sync.</p>
      {!batch ? <form className="bg-white p-6 rounded-xl space-y-4" onSubmit={e => { e.preventDefault(); void save('inventory'); }}>
        <h2 className="text-xl font-bold">Record harvest</h2>
        <label className="block">Harvested quantity (quintals)<input aria-label="Harvested quantity (quintals)" className="block border rounded p-3 w-full" type="number" required min="0.001" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
        <label className="block">Manual quality grade<select className="block border rounded p-3 w-full" value={grade} onChange={e => setGrade(e.target.value)}>{['Ungraded', 'A', 'B', 'C'].map(g => <option key={g}>{g}</option>)}</select></label>
        <button disabled={busy || cycle.status !== 'active'} className="bg-green-700 text-white rounded p-3 disabled:opacity-50">{busy ? 'Saving…' : 'Save inventory'}</button>
      </form> : <section className="bg-white p-6 rounded-xl space-y-4">
        <h2 className="text-xl font-bold">{sale ? 'Sale recorded' : 'Harvest in storage'}</h2>
        <p>{batch.quantity} quintals · Manual grade: {batch.qualityGrade}</p>
        {!sale ? <form onSubmit={e => { e.preventDefault(); void save('sale'); }} className="space-y-4">
          <p>Enter the price of a sale you have already agreed. Recording it here does not contact a buyer or transfer money. This records the entire batch as sold.</p>
          <label className="block">Agreed price (INR per quintal)<input aria-label="Agreed price (INR per quintal)" className="block border rounded p-3 w-full" type="number" required min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label>
          <button disabled={busy} className="bg-green-700 text-white rounded p-3 disabled:opacity-50">{busy ? 'Saving…' : 'Record sale and complete cycle'}</button>
        </form> : <>
          <p>Recorded revenue: ₹{sale.totalRevenue.toLocaleString('en-IN')}</p>
          <p>Activities recorded against this cycle: ₹{costs.toLocaleString('en-IN')}</p>
          <p>Revenue less recorded activity costs: ₹{(sale.totalRevenue - costs).toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-600">This is not a complete profit calculation. Unrecorded expenses, labour, storage, transport and other costs are excluded.</p>
        </>}
      </section>}
    </>}
  </main>;
}
