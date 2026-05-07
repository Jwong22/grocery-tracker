"use client";

import { useEffect, useMemo, useRef } from "react";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
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

const pendingIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3),0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

L.Marker.prototype.options.icon = defaultIcon;

export type StoreMarker = {
  id: string;
  name: string;
  hint: string | null;
  lat: number;
  lng: number;
};

type Props = {
  stores: StoreMarker[];
  pendingPin: { lat: number; lng: number } | null;
  onSelect: (store: StoreMarker) => void;
  onMapClick?: (p: { lat: number; lng: number }) => void;
  initialCenter?: { lat: number; lng: number };
};

const KL = { lat: 3.139, lng: 101.6869 };

export default function StoresMap({
  stores,
  pendingPin,
  onSelect,
  onMapClick,
  initialCenter,
}: Props) {
  const start: LatLngExpression = initialCenter
    ? [initialCenter.lat, initialCenter.lng]
    : stores.length > 0
      ? [stores[0].lat, stores[0].lng]
      : [KL.lat, KL.lng];

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points: [number, number][] = stores.map((s) => [s.lat, s.lng]);
    if (pendingPin) points.push([pendingPin.lat, pendingPin.lng]);
    if (points.length < 2) return null;
    return L.latLngBounds(points);
  }, [stores, pendingPin]);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={start}
        zoom={11}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        <FlyToPin pin={pendingPin} />
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        {stores.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <div className="min-w-44">
                <div className="font-medium text-foreground">{s.name}</div>
                {s.hint && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.hint}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Use this store
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        {pendingPin && (
          <Marker position={[pendingPin.lat, pendingPin.lng]} icon={pendingIcon} />
        )}
      </MapContainer>
    </div>
  );
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  const didFitRef = useRef(false);
  useEffect(() => {
    if (!bounds || didFitRef.current) return;
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    didFitRef.current = true;
  }, [bounds, map]);
  return null;
}

function FlyToPin({ pin }: { pin: { lat: number; lng: number } | null }) {
  const map = useMap();
  const lastRef = useRef("");
  useEffect(() => {
    if (!pin) return;
    const key = `${pin.lat.toFixed(6)},${pin.lng.toFixed(6)}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 15), {
      duration: 0.4,
    });
  }, [pin, map]);
  return null;
}

function ClickHandler({
  onClick,
}: {
  onClick: (p: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}
