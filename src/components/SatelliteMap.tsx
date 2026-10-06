import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
export default function SatelliteMap({ positions, tileUrl, name, onTileError }: { positions: [number,number][]; tileUrl?: string; name: string; onTileError: () => void }) {
  return <MapContainer bounds={positions} boundsOptions={{ padding:[30,30], maxZoom:17 }} scrollWheelZoom={false} style={{ height:420, width:'100%' }}>
    <TileLayer attribution='Tiles &copy; Esri, Maxar, Earthstar Geographics' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
    {tileUrl && <TileLayer key={tileUrl} url={tileUrl} opacity={0.8} maxNativeZoom={14} maxZoom={19} attribution='Sentinel-2 / Copernicus, Microsoft Planetary Computer' eventHandlers={{ tileerror: onTileError }} />}
    <Polygon positions={positions} pathOptions={{ color:'#2563eb', fillOpacity:0 }}><Popup>{name} · saved field boundary</Popup></Polygon>
  </MapContainer>;
}
