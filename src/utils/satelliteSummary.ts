import type { SatelliteScene } from '@/services/sentinelService';

export function observationAgeDays(date: string, now = Date.now()) {
  const time = Date.parse(date);
  return Number.isFinite(time) ? Math.max(0,Math.floor((now-time)/86400000)) : null;
}
export function vegetationChange(current: SatelliteScene, previous: SatelliteScene) {
  if (!current.stats || !previous.stats || current.stats.method !== previous.stats.method) return undefined;
  if (current.date.slice(0,10) === previous.date.slice(0,10) || Date.parse(current.date) <= Date.parse(previous.date)) return undefined;
  const delta = current.stats.mean - previous.stats.mean;
  if (!Number.isFinite(delta)) return undefined;
  return { delta, label: Math.abs(delta) < 0.005 ? 'Little change in mean NDVI' : delta > 0 ? 'Mean NDVI increased' : 'Mean NDVI decreased' };
}
export function satelliteCsv(scenes: SatelliteScene[]) {
  return ['observation_date,scene_id,scene_cloud_percent,mean_ndvi,min_ndvi,max_ndvi,valid_pixels,valid_percent', ...scenes.map(scene => [scene.date,scene.id,scene.cloudCover ?? '',scene.stats?.mean ?? '',scene.stats?.min ?? '',scene.stats?.max ?? '',scene.stats?.validPixels ?? '',scene.stats?.validPercent ?? ''].map(value => `"${String(value).replace(/"/g,'""')}"`).join(','))].join('\n');
}
