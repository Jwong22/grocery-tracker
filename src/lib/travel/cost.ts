// Estimate travel cost from user home to a store and back.
// `price + (km_round_trip × petrol_per_km) + (hours_round_trip × time_per_hour)`
// Uses Haversine for straight-line distance and a fixed average speed since
// we don't yet hit OSRM/Mapbox per-search.

const EARTH_RADIUS_KM = 6371;
const URBAN_AVG_KM_H = 30; // Klang Valley driving estimate

export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

export type TravelInputs = {
  home: LatLng;
  store: LatLng;
  petrolPerKmMyr: number;
  timePerHourMyr: number;
};

export type TravelEstimate = {
  oneWayKm: number;
  roundTripKm: number;
  roundTripHours: number;
  petrolCostMyr: number;
  timeCostMyr: number;
  totalAddedMyr: number;
};

export function estimateTravelCost(input: TravelInputs): TravelEstimate {
  const oneWayKm = haversineKm(input.home, input.store);
  const roundTripKm = oneWayKm * 2;
  const roundTripHours = roundTripKm / URBAN_AVG_KM_H;
  const petrolCostMyr = roundTripKm * input.petrolPerKmMyr;
  const timeCostMyr = roundTripHours * input.timePerHourMyr;
  return {
    oneWayKm,
    roundTripKm,
    roundTripHours,
    petrolCostMyr,
    timeCostMyr,
    totalAddedMyr: petrolCostMyr + timeCostMyr,
  };
}
