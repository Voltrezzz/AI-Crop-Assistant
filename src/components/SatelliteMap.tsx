import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
function LocationPicker({ onPick }: { onPick?: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: event => onPick?.(event.latlng.lat, event.latlng.lng) });
  return null;
}
export default function SatelliteMap({ positions, tileUrl, name, onTileError, onPick, center }: { positions?: [number,number][]; tileUrl?: string; name: string; onTileError: () => void; onPick?: (latitude: number, longitude: number) => void; center?: [number,number] }) {
  return <MapContainer bounds={positions} center={positions ? undefined : [20.59,78.96]} zoom={positions ? undefined : 5} boundsOptions={{ padding:[30,30], maxZoom:17 }} scrollWheelZoom={false} style={{ height:480, width:'100%' }}>
    <TileLayer attribution='Tiles &copy; Esri, Maxar, Earthstar Geographics' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
    {tileUrl && <TileLayer key={tileUrl} url={tileUrl} opacity={0.8} maxNativeZoom={14} maxZoom={19} attribution='Sentinel-2 / Copernicus, Microsoft Planetary Computer' eventHandlers={{ tileerror: onTileError }} />}
    {positions && <Polygon positions={positions} pathOptions={{ color:'#2563eb', fillOpacity:0 }}><Popup>{name}</Popup></Polygon>}
    {center && <CircleMarker center={center} radius={7} pathOptions={{ color:'#ffffff',fillColor:'#2563eb',fillOpacity:1 }}><Popup>Selected location</Popup></CircleMarker>}
    <LocationPicker onPick={onPick} />
  </MapContainer>;
}
