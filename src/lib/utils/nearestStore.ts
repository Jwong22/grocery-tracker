"use client";

import { getAllStoresForMap, type StoreMapRow } from "@/lib/queries/catalog";

/**
 * Get the user's current GPS position.
 * Returns null if denied or unavailable.
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Find the nearest store to the given position.
 * Returns the closest store within 5km, or null if none found.
 */
export async function findNearestStore(
  position: { lat: number; lng: number },
): Promise<StoreMapRow | null> {
  const stores = await getAllStoresForMap();
  let nearest: StoreMapRow | null = null;
  let minDist = Infinity;

  for (const store of stores) {
    if (store.lat == null || store.lng == null) continue;
    const dist = haversineKm(position, { lat: store.lat, lng: store.lng });
    if (dist < minDist) {
      minDist = dist;
      nearest = store;
    }
  }

  // Only auto-select if within 5km
  if (minDist > 5) return null;
  return nearest;
}
