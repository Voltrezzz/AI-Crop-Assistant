import { useEffect, useState } from 'react';
import { ExternalLink, LocateFixed } from 'lucide-react';

type Coordinates = { latitude: number; longitude: number };

type Props = {
  keyword: string;
  title: string;
  actionLabel?: string;
};

export default function NearbyPlacesMap({ keyword, title, actionLabel = 'Search Nearby Places' }: Props) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState(() => navigator.geolocation ? 'Requesting your location...' : 'Location is not available in this browser.');

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setStatus('');
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Enable location access to use nearby search.'
        : 'Unable to determine your location. Please try again.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  if (!coordinates) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-green-100 bg-green-50/40 p-6 text-center">
        <LocateFixed className="mb-3 h-8 w-8 text-green-600" />
        <p className="text-sm text-gray-600">{status}</p>
      </div>
    );
  }

  const { latitude, longitude } = coordinates;
  const offset = 0.018;
  const bbox = `${longitude - offset},${latitude - offset},${longitude + offset},${latitude + offset}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const searchQuery = `${keyword} near ${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;

  return (
    <div className="space-y-3 text-left">
      <iframe
        title="OpenStreetMap showing your current location"
        src={mapUrl}
        className="h-80 w-full rounded-xl border border-green-100"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="text-xs text-gray-500">Your approximate position is shown using OpenStreetMap. {title}</p>
      <a
        href={searchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        {actionLabel} <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
