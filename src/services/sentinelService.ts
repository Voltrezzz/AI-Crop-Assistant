import { db } from '@/db/database';
import { parseFieldBoundary } from '@/utils/fieldBoundary';
import { queueCloudChange } from './cloudSyncService';

const ORIGIN = 'https://planetarycomputer.microsoft.com';
export const NDVI_EXPRESSION = '(B08-B04)/(B08+B04)';
export const HARMONIZED_NDVI_EXPRESSION = '(where(B08>1000,B08-1000,0)-where(B04>1000,B04-1000,0))/(where(B08>1000,B08-1000,0)+where(B04>1000,B04-1000,0))';
export function ndviExpression(scene: SatelliteScene) {
  if (!scene.processingBaseline || !/^\d{2}\.\d{2}$/.test(scene.processingBaseline)) throw new Error('Scene processing baseline is unknown. Run a new scene search.');
  return Number(scene.processingBaseline) >= 4 ? HARMONIZED_NDVI_EXPRESSION : NDVI_EXPRESSION;
}
export interface SatelliteGeometry { type: 'Polygon'; coordinates: number[][][]; }
export interface SatelliteStats { method: 'baseline-harmonized-v1'; mean: number; min: number; max: number; validPixels: number; validPercent: number; }
export interface SatelliteScene { id: string; date: string; cloudCover: number | null; processingBaseline?: string; stats?: SatelliteStats; }
export interface SatelliteSearch { id?: number; userId: number; fieldId: number; boundary: string; scenes: SatelliteScene[]; fetchedAt: string; startDate: string; endDate: string; maxCloudCover: number; }

export function satelliteGeometry(boundary: string): SatelliteGeometry {
  const points = parseFieldBoundary(boundary);
  if (points.length > 500) throw new Error('Simplify the satellite boundary to at most 500 points.');
  const ring = points.map(([lat, lng]) => [lng, lat]);
  if (ring[0].join() !== ring[ring.length - 1].join()) ring.push([...ring[0]]);
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  if (Math.max(...xs)-Math.min(...xs) > 0.1 || Math.max(...ys)-Math.min(...ys) > 0.1) throw new Error('Use a field boundary less than 0.1 degrees wide and tall.');
  const area = ring.slice(0,-1).reduce((sum,p,i) => sum + p[0]*ring[i+1][1]-ring[i+1][0]*p[1],0);
  if (Math.abs(area) < 1e-12) throw new Error('Boundary has no measurable area.');
  return { type: 'Polygon', coordinates: [ring] };
}
async function jsonRequest(url: string, init: RequestInit = {}, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 45000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Satellite service returned ${response.status}. Please retry later.`);
    return await response.json();
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
function ndviParams(scene: SatelliteScene) {
  return new URLSearchParams({ collection: 'sentinel-2-l2a', item: scene.id, expression: ndviExpression(scene), asset_as_band: 'true', unscale: 'false', nodata: '0' });
}
export class SentinelService {
  static async search(geometry: SatelliteGeometry, startDate: string, endDate: string, maxCloudCover: number, signal?: AbortSignal): Promise<SatelliteScene[]> {
    if (![startDate,endDate].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d) || startDate > endDate) throw new Error('Choose valid, ordered search dates.');
    if (!Number.isFinite(maxCloudCover) || maxCloudCover < 0 || maxCloudCover > 100) throw new Error('Cloud cover must be between 0 and 100.');
    satelliteGeometry(JSON.stringify(geometry));
    const data = await jsonRequest(`${ORIGIN}/api/stac/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collections: ['sentinel-2-l2a'], intersects: geometry, datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`, query: { 'eo:cloud_cover': { lte: maxCloudCover } }, sortby: [{ field: 'datetime', direction: 'desc' }], limit: 12 }) }, signal);
    if (!Array.isArray(data.features)) throw new Error('Satellite catalogue returned invalid scene data.');
    return data.features.slice(0,12).flatMap((item: any) => {
      const date = item.properties?.datetime, cloud = item.properties?.['eo:cloud_cover'];
      if (typeof item.id !== 'string' || !/^S2[A-Z0-9_]+$/.test(item.id) || !Number.isFinite(Date.parse(date)) || !item.assets?.B04 || !item.assets?.B08) return [];
      return [{ id: item.id, date, processingBaseline: typeof item.properties?.['s2:processing_baseline'] === 'string' ? item.properties['s2:processing_baseline'] : undefined, cloudCover: typeof cloud === 'number' && cloud >= 0 && cloud <= 100 ? cloud : null }];
    });
  }
  static async tiles(scene: SatelliteScene, signal?: AbortSignal): Promise<string> {
    const params = ndviParams(scene); params.set('tile_format','png'); params.set('rescale','-1,1'); params.set('colormap_name','rdylgn');
    const data = await jsonRequest(`${ORIGIN}/api/data/v1/item/WebMercatorQuad/tilejson.json?${params}`, {}, signal);
    const tile = data.tiles?.[0];
    if (typeof tile !== 'string' || new URL(tile).origin !== ORIGIN || !new URL(tile).pathname.startsWith('/api/data/v1/item/tiles/') || !['{z}','{x}','{y}'].every(key => tile.includes(key))) throw new Error('Satellite service returned an unsupported tile source.');
    return tile;
  }
  static async statistics(scene: SatelliteScene, geometry: SatelliteGeometry, signal?: AbortSignal): Promise<SatelliteStats> {
    satelliteGeometry(JSON.stringify(geometry));
    const data = await jsonRequest(`${ORIGIN}/api/data/v1/item/statistics?${ndviParams(scene)}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ type:'Feature', properties:{}, geometry }) }, signal);
    const stats = data.properties?.statistics?.[ndviExpression(scene)];
    if (!stats || !['mean','min','max','valid_pixels','valid_percent'].every(k => Number.isFinite(stats[k])) || stats.valid_pixels <= 0 || stats.mean < -1 || stats.mean > 1 || stats.valid_percent < 0 || stats.valid_percent > 100) throw new Error('No usable field NDVI statistics for this scene.');
    return { method: 'baseline-harmonized-v1', mean: stats.mean, min: stats.min, max: stats.max, validPixels: stats.valid_pixels, validPercent: stats.valid_percent };
  }
}

export async function ownedSatelliteField(userId: number, fieldId: number) {
  const field = await db.fields.get(fieldId);
  if (!field || field.userId !== userId) throw new Error('Field unavailable.');
  const boundary = await db.fieldBoundaries.where('fieldId').equals(fieldId).filter(b => b.userId === userId).last();
  const text = boundary?.geoJson || field.boundaries;
  if (!text) return { field, boundary: undefined };
  try { return { field, boundary: JSON.stringify(satelliteGeometry(text)) }; }
  catch { return { field, boundary: undefined }; }
}
export async function saveSatelliteBoundary(userId: number, fieldId: number, text: string) {
  const geometry = JSON.stringify(satelliteGeometry(text));
  await db.transaction('rw', db.tables, async () => {
    const field = await db.fields.get(fieldId);
    if (field?.userId !== userId) throw new Error('Field unavailable.');
    const existing = await db.fieldBoundaries.where('fieldId').equals(fieldId).filter(b => b.userId === userId).last();
    const record = { ...existing, userId, fieldId, geoJson: geometry, createdAt: new Date().toISOString() };
    const id = await db.fieldBoundaries.put(record);
    await queueCloudChange(userId,'fieldBoundaries',existing ? 'update' : 'create',{ ...record, id },{ deferSync:true });
    await db.satelliteSearches.where('[userId+fieldId]').equals([userId,fieldId]).delete();
  });
  return geometry;
}
export async function saveSatelliteSearch(search: SatelliteSearch) {
  return db.transaction('rw',db.fields,db.fieldBoundaries,db.satelliteSearches, async () => {
    const owned = await ownedSatelliteField(search.userId,search.fieldId);
    if (!owned.boundary || owned.boundary !== search.boundary) throw new Error('Field boundary changed. Search again.');
    const existing = await db.satelliteSearches.where('[userId+fieldId]').equals([search.userId,search.fieldId]).first();
    return db.satelliteSearches.put({ ...search, id:existing?.id });
  });
}
