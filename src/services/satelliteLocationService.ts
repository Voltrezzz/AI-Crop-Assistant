import { satelliteGeometry, type SatelliteGeometry } from './sentinelService';

export interface SatelliteLocation { latitude: number; longitude: number; label: string; }

export function locationPreviewGeometry(location: SatelliteLocation, halfWidthMetres = 250): SatelliteGeometry {
  const { latitude, longitude } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 80 || Math.abs(longitude) > 180) throw new Error('Choose a location between 80° south and 80° north with a valid longitude.');
  if (![100, 250, 500].includes(halfWidthMetres)) throw new Error('Choose a supported preview size.');
  const dy = halfWidthMetres / 111320;
  const dx = halfWidthMetres / (111320 * Math.cos(latitude * Math.PI / 180));
  if (Math.abs(longitude) + dx > 180) throw new Error('Select a location away from the date line.');
  return satelliteGeometry(JSON.stringify({ type: 'Polygon', coordinates: [[[longitude-dx,latitude-dy],[longitude+dx,latitude-dy],[longitude+dx,latitude+dy],[longitude-dx,latitude+dy],[longitude-dx,latitude-dy]]] }));
}

export async function searchSatellitePlaces(query: string, signal?: AbortSignal): Promise<SatelliteLocation[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 200) throw new Error('Enter a village, town or district name (2–200 characters).');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(abort,15000);
  let data;
  try {
  const response = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: '5' })}`, { signal:controller.signal });
  if (!response.ok) throw new Error('Place search is unavailable. Choose a point on the map instead.');
  data = await response.json();
  } finally { clearTimeout(timer); signal?.removeEventListener('abort',abort); }
  if (!Array.isArray(data.features)) throw new Error('Place search returned invalid results.');
  return data.features.flatMap((feature: any) => {
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    const properties = feature.properties || {};
    const location = { longitude, latitude, label: [...new Set([properties.name, properties.city, properties.district, properties.state, properties.country].filter((part): part is string => typeof part === 'string' && part.length > 0))].join(', ') };
    try { locationPreviewGeometry(location); return location.label ? [location] : []; } catch { return []; }
  });
}
