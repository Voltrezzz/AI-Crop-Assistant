/** Read a single GeoJSON Polygon, or the legacy Leaflet latitude/longitude ring. */
export function parseFieldBoundary(text: string): [number, number][] {
  const value = JSON.parse(text);
  const geometry = value?.type === 'Feature' ? value.geometry : value;
  const legacy = Array.isArray(value);
  if (!legacy && (geometry?.type !== 'Polygon' || geometry.coordinates?.length !== 1)) {
    throw new Error('Use a single GeoJSON Polygon without holes.');
  }
  const ring = legacy ? value : geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3 || ring.length > 10000) throw new Error('Boundary requires 3–10000 points.');
  const positions: [number, number][] = ring.map((point: unknown) => {
    if (!Array.isArray(point) || point.length < 2 || !point.slice(0, 2).every(v => typeof v === 'number' && Number.isFinite(v))) throw new Error('Invalid boundary coordinate.');
    const [lat, lng] = legacy ? point : [point[1], point[0]];
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Coordinate outside latitude/longitude limits.');
    return [lat, lng];
  });
  if (new Set(positions.map(p => p.join(','))).size < 3) throw new Error('Boundary needs three distinct points.');
  if (!legacy && (positions[0][0] !== positions[positions.length - 1][0] || positions[0][1] !== positions[positions.length - 1][1])) throw new Error('GeoJSON polygon ring must be closed.');
  return positions;
}
