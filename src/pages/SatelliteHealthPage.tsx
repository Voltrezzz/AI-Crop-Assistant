import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Satellite, Download, MapPin, LocateFixed, Search } from 'lucide-react';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { parseFieldBoundary } from '@/utils/fieldBoundary';
import { SentinelService, ownedSatelliteField, saveSatelliteBoundary, saveSatelliteSearch, type SatelliteScene, type SatelliteSearch, type SatelliteGeometry } from '@/services/sentinelService';
import { locationPreviewGeometry, searchSatellitePlaces, type SatelliteLocation } from '@/services/satelliteLocationService';
import { observationAgeDays, vegetationChange, satelliteCsv } from '@/utils/satelliteSummary';
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
  const [mapView, setMapView] = useState<'vegetation' | 'background' | 'overlay'>('vegetation');
  const [opacity, setOpacity] = useState(0.8);
  const [tilesReady, setTilesReady] = useState(false);
  const [editingPoint, setEditingPoint] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);
  const [comparisonId, setComparisonId] = useState('');
  const [comparison, setComparison] = useState<{ scene: SatelliteScene; tileUrl?: string }>();
  const [comparisonError, setComparisonError] = useState('');
  const [error, setError] = useState(''), [tileError, setTileError] = useState('');
  const [busy, setBusy] = useState(false), [savingBoundary, setSavingBoundary] = useState(false);
  const [boundaryInput, setBoundaryInput] = useState('');
  const [location, setLocation] = useState<SatelliteLocation>();
  const [halfWidth, setHalfWidth] = useState(250);
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<SatelliteLocation[]>([]);
  const [finding, setFinding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [startDate, setStartDate] = useState(() => { const date = new Date(); date.setDate(date.getDate()-90); return date.toISOString().slice(0,10); });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));
  const [maxCloud, setMaxCloud] = useState('40');
  const request = useRef<AbortController | null>(null);
  const placeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const mapSection = useRef<HTMLElement | null>(null);
  useEffect(() => { if (tileUrl) mapSection.current?.scrollIntoView?.({ behavior:'smooth', block:'start' }); }, [tileUrl]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); placeRequest.current?.abort(); }; }, []);
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
  const boundary = location ? JSON.stringify(locationPreviewGeometry(location,halfWidth)) : context?.boundary;
  const geometry = boundary ? JSON.parse(boundary) as SatelliteGeometry : undefined;
  const positions = boundary ? parseFieldBoundary(boundary) : undefined;
  const scene = saved?.scenes.find(s => s.id === selectedId);
  const previousScenes = saved?.scenes.filter(s => scene && s.date.slice(0,10) < scene.date.slice(0,10)) || [];
  const change = scene && comparison ? vegetationChange(scene,comparison.scene) : undefined;
  const areaName = location ? location.label : context?.field.name || 'Choose a location';
  function resetResults() { request.current?.abort(); setBusy(false); setSaved(null); setSelectedId(''); setTileUrl(undefined); setTileError(''); setError(''); setTilesReady(false); setComparison(undefined); setComparisonId(''); setComparisonError(''); setEditingPoint(false); }
  function pickLocation(next: SatelliteLocation) {
    if (busy || savingBoundary) return;
    try { locationPreviewGeometry(next,halfWidth); resetResults(); setLocation(next); setPlaces([]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Invalid location.'); }
  }
  async function findPlaces(event: React.FormEvent) {
    event.preventDefault(); if (finding) return;
    const controller = new AbortController(); placeRequest.current?.abort(); placeRequest.current = controller;
    setFinding(true); setError(''); setPlaces([]);
    try { const matches = await searchSatellitePlaces(placeQuery,controller.signal); if (!controller.signal.aborted) { setPlaces(matches); if (!matches.length) setError('No places found. Try your district name or tap the map.'); } }
    catch { if (!controller.signal.aborted) setError('Place search is unavailable. Tap the map to choose your location.'); }
    finally { if (!controller.signal.aborted) setFinding(false); }
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) { setError('Location is unavailable in this browser. Search a place or tap the map.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current) return;
      setLocating(false);
      pickLocation({ latitude:position.coords.latitude, longitude:position.coords.longitude, label:`Current location (accuracy about ${Math.round(position.coords.accuracy)} m)` });
    }, () => { if (mounted.current) { setLocating(false); setError('Could not get your location. Allow location access, search a place, or tap the map.'); } }, { enableHighAccuracy:true,timeout:15000,maximumAge:60000 });
  }
  async function importBoundary() {
    if (!userId || !id || savingBoundary || busy) return;
    setSavingBoundary(true); setError('');
    try {
      const imported = await saveSatelliteBoundary(userId,Number(id),boundaryInput);
      const ctx = await ownedSatelliteField(userId,Number(id)); setContext(ctx); setBoundaryInput(imported); setLocation(undefined); resetResults();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save boundary.'); }
    finally { setSavingBoundary(false); }
  }
  async function persist(result: SatelliteSearch) { if (!location && id) await saveSatelliteSearch(result); }
  async function retrieveScene(result: SatelliteSearch, selected: SatelliteScene, shape: SatelliteGeometry, controller: AbortController) {
    setSelectedId(selected.id);
    setTilesReady(false); setMapView('vegetation'); setEditingPoint(false); setComparison(undefined); setComparisonError(''); setComparisonId('');
    const results = await Promise.allSettled([SentinelService.tiles(selected,controller.signal), SentinelService.statistics(selected,shape,controller.signal)]);
    if (controller.signal.aborted) return;
    if (results[0].status === 'fulfilled') setTileUrl(results[0].value); else setTileError('NDVI imagery is unavailable for this date. Choose another observation below.');
    if (results[1].status === 'fulfilled') {
      const stats = results[1].value;
      const next = { ...result, scenes:result.scenes.map(s => s.id === selected.id ? { ...s, stats } : s) };
      await persist(next); if (!controller.signal.aborted) setSaved(next);
    } else setError('Area statistics are unavailable for this date. The image may still load; choose another date.');
  }
  async function search() {
    if (!userId || !boundary || !geometry || busy || locating) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setError(''); setTileError(''); setTileUrl(undefined); setSaved(null); setSelectedId('');
    try {
      const scenes = await SentinelService.search(geometry,startDate,endDate,Number(maxCloud),controller.signal);
      if (controller.signal.aborted) return;
      const result = { userId, fieldId:id ? Number(id) : 0, boundary, scenes, fetchedAt:new Date().toISOString(), startDate, endDate, maxCloudCover:Number(maxCloud) };
      await persist(result);
      if (!controller.signal.aborted) { setSaved(result); if (scenes[0]) await retrieveScene(result,scenes[0],geometry,controller); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Satellite preview failed. Check your connection.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function loadScene(selected: SatelliteScene) {
    if (!saved || !geometry || busy) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setError(''); setTileError(''); setTileUrl(undefined);
    try { await retrieveScene(saved,selected,geometry,controller); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load scene.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function compareObservations() {
    const previous = previousScenes.find(s => s.id === comparisonId) || previousScenes[0];
    if (!saved || !scene?.stats || !previous || !geometry || busy) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setComparison(undefined); setComparisonError('');
    try {
      const results = await Promise.allSettled([SentinelService.tiles(previous,controller.signal),previous.stats ? Promise.resolve(previous.stats) : SentinelService.statistics(previous,geometry,controller.signal)]);
      if (controller.signal.aborted) return;
      const compared = { ...previous, stats:results[1].status === 'fulfilled' ? results[1].value : undefined };
      setComparison({scene:compared,tileUrl:results[0].status === 'fulfilled' ? results[0].value : undefined});
      if (results[0].status === 'rejected' || results[1].status === 'rejected') setComparisonError('Some comparison data could not load. Try another observation.');
      if (compared.stats) { const next = { ...saved,scenes:saved.scenes.map(s => s.id === previous.id ? compared : s) }; await persist(next); if (!controller.signal.aborted) setSaved(next); }
    } catch (e) { if (!controller.signal.aborted) setComparisonError(e instanceof Error ? e.message : 'Comparison failed.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function exportCsv() {
    if (!saved) return;
    const url = URL.createObjectURL(new Blob([satelliteCsv(saved.scenes)],{type:'text/csv'}));
    const a = document.createElement('a'); a.href=url; a.download='vegetation-observations.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  function exportScenes() {
    if (!saved) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...saved, areaName, mode:location ? 'location-preview' : 'field-boundary' },null,2)],{ type:'application/json' }));
    const a = document.createElement('a'); a.href=url; a.download='satellite-preview-history.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  return <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-28 space-y-5">
    <header className="rounded-2xl bg-green-800 text-white p-5 sm:p-7"><h1 className="text-3xl font-bold flex items-center gap-3"><Satellite size={32} />Satellite Monitoring</h1><p className="mt-2 text-green-100">See satellite imagery for your location. No JSON needed.</p></header>
    <section className="card space-y-4"><h2 className="font-bold text-xl">1. Choose your location</h2>
      <form onSubmit={event => void findPlaces(event)} className="flex flex-col sm:flex-row gap-3"><label className="flex-1 font-medium">Village, town or district<input className="input-field mt-1" value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} placeholder="e.g. Thanjavur, Tamil Nadu" maxLength={200} /></label><button disabled={finding || busy || locating || placeQuery.trim().length < 2} className="btn-secondary self-end inline-flex gap-2 items-center"><Search size={18} />{finding ? 'Finding places…' : 'Find place'}</button></form>
      {places.length > 0 && <div className="space-y-2" aria-label="Place results">{places.map((place,index) => <button key={index} disabled={busy} onClick={() => pickLocation(place)} className="block w-full text-left rounded-xl border border-green-200 p-3 hover:bg-green-50"><MapPin className="inline mr-2" size={18} />{place.label}</button>)}</div>}
      <button disabled={locating || busy || savingBoundary} onClick={useCurrentLocation} className="btn-secondary inline-flex items-center gap-2"><LocateFixed size={18} />{locating ? 'Getting your location…' : 'Use my current location'}</button>
      <p className="text-sm text-gray-600">Or zoom in and tap your farm on the map below. Current location is useful when you are at the farm. Place search sends your search text to Photon; map tiles and satellite requests send the chosen area to map providers and Microsoft Planetary Computer. Nothing is sent to satellite services until you choose “Show satellite preview”.</p>
      {location && <div className="rounded-xl bg-green-50 dark:bg-green-950 p-4 space-y-2"><p className="font-semibold">Selected: {location.label}</p><p className="text-sm">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p><label className="text-sm">Preview area<select disabled={busy || locating} className="input-field mt-1" value={halfWidth} onChange={e => { resetResults(); setHalfWidth(Number(e.target.value)); }}><option value={100}>200 m × 200 m</option><option value={250}>500 m × 500 m</option><option value={500}>1 km × 1 km</option></select></label><p className="text-xs">This square is an approximate area around your point, not your exact field boundary. Tap the map to refine the location.</p></div>}
      <button disabled={!geometry || busy || savingBoundary || locating} onClick={() => void search()} className="btn-primary w-full sm:w-auto text-lg inline-flex items-center justify-center gap-2"><Satellite size={22} />{busy ? 'Loading satellite preview…' : 'Show satellite preview'}</button>
      {!geometry && <p className="text-sm text-gray-500">Select a place, use your location, or tap the map to enable the preview.</p>}
    </section>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl">{error}</p>}
    <section ref={mapSection} className="card space-y-4 scroll-mt-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-xl">2. {tileUrl ? 'Your satellite preview' : 'Choose a point on the map'}</h2><p className="text-sm text-gray-600">{areaName}</p></div>{scene && <span className="rounded-full bg-green-50 text-green-800 px-3 py-2 text-sm">Observation: {new Date(scene.date).toLocaleDateString()}</span>}</div>
      {tileError && <p role="alert" className="text-amber-800">{tileError}</p>}
      <div role="status" className={`rounded-xl p-4 ${tileUrl && mapView !== 'background' ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100' : 'bg-amber-50 text-amber-900'}`}>
        <p className="font-bold">{tileUrl && mapView !== 'background' ? tileError ? 'Vegetation layer has missing tiles' : tilesReady ? 'Sentinel-2 vegetation colours are visible' : 'Loading vegetation colour tiles…' : 'Background image only — no vegetation colours shown'}</p>
        <p className="text-sm mt-1">{tileUrl && mapView !== 'background' ? 'The colours come from red and near-infrared satellite measurements. They are not the natural colours of the land.' : 'This ordinary aerial image helps locate your farm. Load or select the vegetation layer to see the NDVI signal.'}</p>
        {!tileUrl && geometry && <button disabled={busy || locating} onClick={() => void search()} className="btn-primary mt-3">{busy ? 'Loading vegetation layer…' : 'Load vegetation colours'}</button>}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Map display controls">
        {(['vegetation','background','overlay'] as const).map(view => <button key={view} disabled={!tileUrl} aria-pressed={mapView === view} onClick={() => { if (view !== mapView) { setMapView(view); if (mapView === 'background') { setTilesReady(false); setTileError(''); } } }} className={`px-4 py-2 rounded-xl border text-sm font-semibold ${mapView === view && tileUrl ? 'bg-green-700 text-white border-green-700' : 'border-gray-300'}`}>{view === 'vegetation' ? 'Vegetation colours' : view === 'background' ? 'Aerial background' : 'Blend both'}</button>)}
        <button disabled={!positions} onClick={() => setRecenterToken(value => value+1)} className="btn-secondary text-sm">Recenter area</button>
        {tileUrl && <button disabled={busy || locating} onClick={() => setEditingPoint(value => !value)} aria-pressed={editingPoint} className="btn-secondary text-sm">{editingPoint ? 'Cancel location change' : 'Change location on map'}</button>}
      </div>
      {mapView === 'overlay' && tileUrl && <label className="block text-sm">Vegetation layer opacity: {Math.round(opacity*100)}%<input className="block w-full mt-2" type="range" min={20} max={100} value={Math.round(opacity*100)} onChange={e => setOpacity(Number(e.target.value)/100)} /></label>}
      {editingPoint && <p className="text-amber-800 bg-amber-50 rounded-xl p-3">Tap a new point to change the area. This clears the current observation; load a new preview afterwards.</p>}
      <div className="relative rounded-xl overflow-hidden"><Suspense fallback={<p>Loading map…</p>}><SatelliteMap key={boundary || 'location-picker'} positions={positions} tileUrl={tileUrl} view={mapView} opacity={opacity} recenterToken={recenterToken} center={location ? [location.latitude,location.longitude] : undefined} name={areaName} onPick={busy || locating || savingBoundary || (tileUrl && !editingPoint) ? undefined : (latitude,longitude) => pickLocation({latitude,longitude,label:'Point selected on map'})} onTileReady={() => setTilesReady(true)} onTileError={() => setTileError('Some NDVI tiles failed to load. No ordinary background is substituted in Vegetation colours mode. Try another observation.')} /></Suspense>
        {tileUrl && mapView !== 'background' && <div className="absolute bottom-8 left-3 right-3 sm:right-auto sm:w-64 z-[400] bg-white/95 text-gray-900 rounded-xl shadow-lg p-3 pointer-events-none"><p className="text-sm font-bold">NDVI vegetation signal</p><div className="h-3 rounded-full bg-gradient-to-r from-red-600 via-yellow-300 to-green-700 mt-2" /><div className="flex justify-between text-xs mt-1"><span>−1 · Lower</span><span>0</span><span>+1 · Higher</span></div><p className="text-xs mt-1">{scene ? new Date(scene.date).toLocaleDateString() : ''} · {mapView === 'overlay' ? 'Blended with background' : 'Vegetation colours only'}</p></div>}
      </div>
      <p className="text-xs text-gray-500">Blue outline: selected area. Aerial background uses independently dated Esri imagery. Vegetation mode shows the dated Sentinel-2 NDVI layer alone. Clicking a loaded map opens its area label without clearing the observation; use Change location on map to select a new area.</p>
      {scene && <div className="grid sm:grid-cols-3 gap-3 text-sm"><div className="rounded-xl border p-3"><p className="font-semibold">Observation age</p><p>{observationAgeDays(scene.date) ?? 'Unknown'} days · {new Date(scene.date).toLocaleDateString()}</p></div><div className="rounded-xl border p-3"><p className="font-semibold">Scene cloud cover</p><p>{scene.cloudCover === null ? 'Unknown' : `${scene.cloudCover.toFixed(1)}%`} · whole scene, not this area</p></div><div className="rounded-xl border p-3"><p className="font-semibold">Analysed area</p><p>{location ? `${halfWidth*2} m × ${halfWidth*2} m around selected point` : 'Saved field polygon'}</p></div></div>}
      {scene?.stats && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Mean NDVI',scene.stats.mean.toFixed(3)],['Range',`${scene.stats.min.toFixed(2)}–${scene.stats.max.toFixed(2)}`],['Valid pixels',scene.stats.validPixels],['Valid data',`${scene.stats.validPercent.toFixed(1)}%`]].map(([label,value]) => <div key={label} className="rounded-lg bg-green-50 dark:bg-green-950 p-3"><p className="text-xs">{label}</p><p className="font-bold mt-1">{value}</p></div>)}</div>}
      {scene?.stats && <section className="rounded-xl border p-4 space-y-3"><h3 className="font-bold text-lg">Compare observations</h3><p className="text-sm text-gray-600">Compare the same selected area on two different dates. Cloud, season, harvesting and mixed land cover can change NDVI; a change alone is not a diagnosis.</p>{previousScenes.length ? <><label className="block text-sm">Earlier observation<select className="input-field mt-1" disabled={busy} value={comparisonId || previousScenes[0].id} onChange={e => { setComparisonId(e.target.value); setComparison(undefined); setComparisonError(''); }}>{previousScenes.map(s => <option key={s.id} value={s.id}>{new Date(s.date).toLocaleDateString()} · clouds {s.cloudCover === null ? 'unknown' : `${s.cloudCover.toFixed(1)}%`}</option>)}</select></label><button disabled={busy || locating} className="btn-secondary" onClick={() => void compareObservations()}>{busy ? 'Loading observation data…' : 'Compare with earlier date'}</button></> : <p className="text-sm">No earlier date in this search. Widen the date range under Advanced.</p>}
        {comparisonError && <p role="alert" className="text-amber-800">{comparisonError}</p>}
        {comparison && <><div className="grid sm:grid-cols-2 gap-3"><div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3"><p>Earlier · {new Date(comparison.scene.date).toLocaleDateString()}</p><p className="text-lg font-bold">Mean NDVI {comparison.scene.stats?.mean.toFixed(3) ?? 'unavailable'}</p><p className="text-xs">Scene clouds: {comparison.scene.cloudCover === null ? 'unknown' : `${comparison.scene.cloudCover.toFixed(1)}%`}</p></div><div className="rounded-xl bg-green-50 dark:bg-green-950 p-3"><p>Selected · {new Date(scene.date).toLocaleDateString()}</p><p className="text-lg font-bold">Mean NDVI {scene.stats.mean.toFixed(3)}</p>{change && <p className="text-sm font-semibold">{change.label}: {change.delta >= 0 ? '+' : ''}{change.delta.toFixed(3)}</p>}</div></div>{comparison.tileUrl && <><h4 className="font-semibold">Earlier-date vegetation map · {new Date(comparison.scene.date).toLocaleDateString()}</h4><div className="rounded-xl overflow-hidden"><Suspense fallback={<p>Loading comparison map…</p>}><SatelliteMap key={comparison.tileUrl} positions={positions} tileUrl={comparison.tileUrl} name={`${areaName} · earlier observation`} onTileError={() => setComparisonError('Some earlier-date NDVI tiles failed to load.')} /></Suspense></div><p className="text-xs text-gray-500">Same area and −1 to +1 colour scale as the selected-date map above.</p></>}</>}
      </section>}
      {saved && <div className="space-y-3"><h3 className="font-semibold">Other observations</h3>{saved.scenes.length === 0 && <p>No matching observations. Try another location or widen the filters below.</p>}<div className="grid sm:grid-cols-3 gap-2">{saved.scenes.map(s => <button disabled={busy || locating} onClick={() => void loadScene(s)} key={s.id} className={`text-left border p-3 rounded-xl ${selectedId === s.id ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-slate-700'}`}><span className="font-semibold">{new Date(s.date).toLocaleDateString()}</span><span className="block text-sm">Scene clouds: {s.cloudCover === null ? 'Unknown' : `${s.cloudCover.toFixed(1)}%`}</span><span className="block text-xs">{s.stats ? `Saved mean NDVI ${s.stats.mean.toFixed(3)}` : 'Load NDVI map and statistics'}</span></button>)}</div><button onClick={exportScenes} className="btn-secondary inline-flex gap-2 items-center"><Download size={16} />Export history</button><button onClick={exportCsv} className="btn-secondary">Export vegetation CSV</button><p className="text-xs text-gray-500">{location ? 'Location preview history stays on this page; export it to keep a copy. Your saved field boundary is unchanged.' : 'Field observation metadata and statistics are saved locally.'}</p></div>}
      <p className="bg-amber-50 text-amber-900 p-3 rounded-xl text-sm">NDVI is a vegetation signal, not a disease diagnosis. Clouds, shadows, water, soil and buildings can affect the result. Area statistics are not cloud-masked or crop-only. A location preview does not identify your farm boundary.</p>
      <a className="text-xs text-green-700 underline" href="https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a" target="_blank" rel="noreferrer">Source: Copernicus Sentinel-2 L2A on Microsoft Planetary Computer</a>
    </section>
    <details className="card"><summary className="cursor-pointer font-semibold">Advanced: saved fields, exact boundary and date filters</summary><div className="space-y-4 mt-4">
      <label className="block font-medium">Select field<select disabled={busy || locating} className="input-field mt-2" value={id || ''} onChange={e => navigate(e.target.value ? `/fields/${e.target.value}/satellite` : '/satellite')}><option value="">Location preview only</option>{fields?.map(f => <option key={f.id} value={f.id}>{f.name} · {f.crop}</option>)}</select></label>
      {context && <><h3 className="font-bold">{context.field.name} · {context.field.area} {context.field.areaUnit}</h3><Link className="text-green-700 underline" to={`/fields/${id}`}>Field details</Link><label className="block text-sm">Field boundary GeoJSON<textarea className="input-field mt-1 font-mono text-xs" rows={4} value={boundaryInput} onChange={e => setBoundaryInput(e.target.value)} /></label><button disabled={savingBoundary || busy || locating || !boundaryInput.trim()} onClick={() => void importBoundary()} className="btn-secondary">{savingBoundary ? 'Saving…' : 'Save boundary'}</button>{context.boundary && <p className="text-green-700 text-sm">Saved boundary ready for satellite search.</p>}{location && context.boundary && <button className="btn-secondary" disabled={busy || locating} onClick={() => { resetResults(); setLocation(undefined); }}>Use saved field boundary</button>}</>}
      <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">From<input disabled={busy} type="date" className="input-field mt-1" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label className="text-sm">To<input disabled={busy} type="date" className="input-field mt-1" value={endDate} onChange={e => setEndDate(e.target.value)} /></label><label className="text-sm">Maximum scene cloud cover (%)<input disabled={busy} type="number" min={0} max={100} className="input-field mt-1" value={maxCloud} onChange={e => setMaxCloud(e.target.value)} /></label></div>
      <p className="text-xs text-gray-500">Up to 12 intersecting scenes. Scene clouds describe the whole satellite scene, not your exact area. The latest available observation loads automatically; this is not a live camera. Internet is required.</p>
    </div></details>
  </div>;
}
