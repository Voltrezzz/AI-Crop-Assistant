import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Satellite, Download, RefreshCw } from 'lucide-react';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { parseFieldBoundary } from '@/utils/fieldBoundary';
import { SentinelService, ownedSatelliteField, saveSatelliteBoundary, saveSatelliteSearch, type SatelliteScene, type SatelliteSearch, type SatelliteGeometry } from '@/services/sentinelService';
const SatelliteMap = lazy(() => import('@/components/SatelliteMap'));

export default function SatelliteHealthPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = useAuthStore(s => s.user?.id);
  const fields = useLiveQuery(() => userId ? db.fields.where('userId').equals(userId).toArray() : [], [userId]);
  const [context, setContext] = useState<Awaited<ReturnType<typeof ownedSatelliteField>> | null>(null);
  const [saved, setSaved] = useState<SatelliteSearch | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [tileUrl, setTileUrl] = useState<string>();
  const [error, setError] = useState(''), [tileError, setTileError] = useState('');
  const [busy, setBusy] = useState(false), [savingBoundary, setSavingBoundary] = useState(false);
  const [boundaryInput, setBoundaryInput] = useState('');
  const [startDate, setStartDate] = useState(() => { const date = new Date(); date.setDate(date.getDate()-90); return date.toISOString().slice(0,10); });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));
  const [maxCloud, setMaxCloud] = useState('40');
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id || !userId) return;
      try {
        const ctx = await ownedSatelliteField(userId,Number(id));
        const cache = await db.satelliteSearches.where('[userId+fieldId]').equals([userId,Number(id)]).first();
        if (!cancelled) {
          setContext(ctx); setBoundaryInput(ctx.boundary || '');
          if (cache && cache.boundary === ctx.boundary) { setSaved({ ...cache, scenes: cache.scenes.map(s => ({ ...s, stats: s.stats?.method === 'baseline-harmonized-v1' ? s.stats : undefined })) }); setSelectedId(cache.scenes[0]?.id || ''); }
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load field.'); }
    }
    void load();
    return () => { cancelled = true; request.current?.abort(); };
  }, [id,userId]);
  const scene = saved?.scenes.find(s => s.id === selectedId);
  const geometry = context?.boundary ? JSON.parse(context.boundary) as SatelliteGeometry : undefined;
  const positions = context?.boundary ? parseFieldBoundary(context.boundary) : undefined;
  async function importBoundary() {
    if (!userId || !id || savingBoundary || busy) return;
    setSavingBoundary(true); setError('');
    try {
      const boundary = await saveSatelliteBoundary(userId,Number(id),boundaryInput);
      const ctx = await ownedSatelliteField(userId,Number(id)); setContext(ctx); setBoundaryInput(boundary);
      setSaved(null); setSelectedId(''); setTileUrl(undefined); setTileError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save boundary.'); }
    finally { setSavingBoundary(false); }
  }
  async function search() {
    if (!userId || !id || !context?.boundary || !geometry || busy) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setError(''); setTileError(''); setTileUrl(undefined);
    try {
      const scenes = await SentinelService.search(geometry,startDate,endDate,Number(maxCloud),controller.signal);
      if (controller.signal.aborted) return;
      const result = { userId, fieldId:Number(id), boundary:context.boundary, scenes, fetchedAt:new Date().toISOString(), startDate, endDate, maxCloudCover:Number(maxCloud) };
      await saveSatelliteSearch(result);
      if (!controller.signal.aborted) { setSaved(result); setSelectedId(''); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Satellite search failed. Check your connection.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function loadScene(selected: SatelliteScene) {
    if (!saved || !geometry || busy) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setError(''); setTileError(''); setTileUrl(undefined); setSelectedId(selected.id);
    try {
      const results = await Promise.allSettled([SentinelService.tiles(selected,controller.signal), SentinelService.statistics(selected,geometry,controller.signal)]);
      if (controller.signal.aborted) return;
      if (results[0].status === 'fulfilled') setTileUrl(results[0].value); else setTileError('NDVI imagery is unavailable for this scene. Try another date.');
      if (results[1].status === 'fulfilled') {
        const stats = results[1].value;
        const result = { ...saved, scenes:saved.scenes.map(s => s.id === selected.id ? { ...s, stats } : s) };
        await saveSatelliteSearch(result); if (!controller.signal.aborted) setSaved(result);
      } else setError('Field statistics are unavailable for this scene. The map may still load; try another date.');
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load scene.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function exportScenes() {
    if (!saved) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)],{ type:'application/json' }));
    const a = document.createElement('a'); a.href=url; a.download='field-satellite-history.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  return <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-28 space-y-6">
    <header><h1 className="text-3xl font-bold flex items-center gap-3"><Satellite className="text-green-700" />Satellite Monitoring</h1><p className="text-gray-600 mt-2">Sentinel-2 scenes, field boundaries and NDVI imagery.</p></header>
    <section className="card space-y-3"><label className="block font-medium">Select field<select className="input-field mt-2" value={id || ''} onChange={e => navigate(e.target.value ? `/fields/${e.target.value}/satellite` : '/satellite')}><option value="">Choose a saved field</option>{fields?.map(f => <option key={f.id} value={f.id}>{f.name} · {f.crop}</option>)}</select></label>
      {fields?.length === 0 && <p>No fields yet. <Link className="text-green-700 underline" to="/fields/new">Add a field</Link> to begin.</p>}
      <p className="text-sm text-gray-600">Searches send the selected boundary to Microsoft Planetary Computer. Satellite data and map tiles require internet. Saved scene metadata and statistics are available locally after retrieval.</p>
    </section>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl">{error}</p>}
    {id && !context && !error && <p role="status">Loading your field…</p>}
    {context && <>
      <section className="card space-y-3"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold text-lg">{context.field.name} · {context.field.area} {context.field.areaUnit}</h2><Link className="text-green-700 underline" to={`/fields/${id}`}>Field details</Link></div>
        <p className="text-sm text-gray-600">Paste your field's GeoJSON Polygon or Feature with longitude, latitude coordinates. No sample location is substituted. Small fields may contain only a few 10 m satellite pixels.</p>
        <label className="block text-sm">Field boundary GeoJSON<textarea className="input-field mt-1 font-mono text-xs" rows={4} value={boundaryInput} onChange={e => setBoundaryInput(e.target.value)} placeholder='{"type":"Polygon","coordinates":[[[longitude,latitude],...]]}' /></label>
        <button disabled={savingBoundary || busy || !boundaryInput.trim()} onClick={() => void importBoundary()} className="btn-secondary">{savingBoundary ? 'Saving…' : 'Save boundary'}</button>
        {context.boundary && <p role="status" className="text-green-700 text-sm">Saved boundary ready for satellite search.</p>}
      </section>
      {geometry && positions && <>
        <section className="card space-y-4"><h2 className="font-bold text-lg">Search Sentinel-2 scenes</h2><div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">From<input type="date" className="input-field mt-1" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label className="text-sm">To<input type="date" className="input-field mt-1" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <label className="text-sm">Maximum scene cloud cover (%)<input type="number" min={0} max={100} className="input-field mt-1" value={maxCloud} onChange={e => setMaxCloud(e.target.value)} /></label>
        </div><button disabled={busy || savingBoundary} onClick={() => void search()} className="btn-primary inline-flex items-center gap-2"><RefreshCw size={17} />{busy ? 'Loading satellite data…' : 'Search scenes'}</button>
        <p className="text-xs text-gray-500">Returns up to 12 recent intersecting scenes. Scene-level cloud cover does not measure clouds over your exact field. NDVI uses raw band values with the provider’s baseline-04.00+ offset correction.</p></section>
        <div className="grid lg:grid-cols-3 gap-5"><section className="card space-y-3"><h2 className="font-bold text-lg">Scene history</h2>
          {!saved ? <p>Run a search to find dated observations.</p> : <><p className="text-xs text-gray-500">Saved {new Date(saved.fetchedAt).toLocaleString()} · {saved.startDate} to {saved.endDate}</p>{saved.scenes.length === 0 && <p>No matching scenes. Widen the date range or cloud limit.</p>}{saved.scenes.map(s => <button disabled={busy} onClick={() => void loadScene(s)} key={s.id} className={`w-full text-left border p-3 rounded-xl ${selectedId === s.id ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-slate-700'}`}><span className="font-semibold">{new Date(s.date).toLocaleString()}</span><span className="block text-sm">Scene clouds: {s.cloudCover === null ? 'Unknown' : `${s.cloudCover.toFixed(1)}%`}</span><span className="block text-xs">{s.stats ? `Saved mean NDVI ${s.stats.mean.toFixed(3)}` : 'Load NDVI map and statistics'}</span></button>)}<button onClick={exportScenes} className="btn-secondary inline-flex gap-2 items-center"><Download size={16} />Export history</button></>}
        </section><section className="lg:col-span-2 card space-y-4"><h2 className="font-bold text-lg">{tileUrl ? 'Sentinel-2 NDVI layer' : 'Saved field boundary'}</h2>
          {tileError && <p role="alert" className="text-amber-800">{tileError}</p>}
          <div className="rounded-xl overflow-hidden"><Suspense fallback={<p>Loading map…</p>}><SatelliteMap key={context.boundary} positions={positions} tileUrl={tileUrl} name={context.field.name} onTileError={() => setTileError('Some satellite tiles failed to load. The Esri basemap is not the NDVI layer. Retry this scene or another date.')} /></Suspense></div>
          <p className="text-xs text-gray-500">Blue outline: saved field. Esri imagery is a background layer with its own date. NDVI colours: red (lower) → yellow → green (higher), scaled −1 to 1. The satellite layer can extend beyond the field outline.</p>
          {scene?.stats && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Mean NDVI',scene.stats.mean.toFixed(3)],['Range',`${scene.stats.min.toFixed(2)}–${scene.stats.max.toFixed(2)}`],['Valid pixels',scene.stats.validPixels],['Valid data',`${scene.stats.validPercent.toFixed(1)}%`]].map(([label,value]) => <div key={label} className="rounded-lg bg-green-50 dark:bg-green-950 p-3"><p className="text-xs">{label}</p><p className="font-bold mt-1">{value}</p></div>)}</div>}
          <p className="bg-amber-50 text-amber-900 p-3 rounded-xl text-sm">NDVI is a vegetation signal, not a disease diagnosis. These statistics are not masked using a field-specific cloud classifier; clouds, shadows, water, soil and field edges can bias them. Low NDVI alone cannot identify nutrient deficiency or justify treatment.</p>
          <div className="flex flex-wrap gap-3"><Link className="btn-secondary" to="/analyzer">Ground-check with a crop scan</Link><Link className="btn-secondary" to="/add-activity">Record field observation</Link></div>
          <a className="text-xs text-green-700 underline" href="https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a" target="_blank" rel="noreferrer">Source: Copernicus Sentinel-2 L2A on Microsoft Planetary Computer</a>
        </section></div>
      </>}
    </>}
  </div>;
}
