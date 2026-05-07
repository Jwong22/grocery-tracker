"use client";

import { useEffect, useRef } from "react";
import L, { type LatLngExpression, type Map as LeafletMapInstance } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

type Props = {
  lat: number | null;
  lng: number | null;
  fallback?: { lat: number; lng: number; zoom: number };
  zoom?: number;
  onChange: (next: { lat: number; lng: number }) => void;
};

const KL_FALLBACK = { lat: 3.139, lng: 101.6869, zoom: 11 };

export default function LeafletMap({
  lat,
  lng,
  fallback = KL_FALLBACK,
  zoom = 16,
  onChange,
}: Props) {
  const center: LatLngExpression =
    lat !== null && lng !== null
      ? [lat, lng]
      : [fallback.lat, fallback.lng];
  const initialZoom = lat !== null && lng !== null ? zoom : fallback.zoom;

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg border border-border isolate">
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange lat={lat} lng={lng} />
        <ClickToSet onPick={onChange} />
        {lat !== null && lng !== null && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const p = m.getLatLng();
                onChange({ lat: p.lat, lng: p.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function ClickToSet({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (lat === null || lng === null) return;
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.5 });
  }, [lat, lng, map]);
  return null;
}

export type { LeafletMapInstance };
