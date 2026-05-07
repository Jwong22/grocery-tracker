"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "./actions";

const initialState: SettingsState = { ok: false };

type Props = {
  defaults: {
    home_lat: number | null;
    home_lng: number | null;
    petrol_cost_per_km_myr: number;
    time_value_per_hour_myr: number;
    gemini_api_key_present: boolean;
  };
};

export function SettingsForm({ defaults }: Props) {
  const [state, formAction, pending] = useActionState(
    saveSettings,
    initialState,
  );
  const [lat, setLat] = useState(
    defaults.home_lat === null ? "" : String(defaults.home_lat),
  );
  const [lng, setLng] = useState(
    defaults.home_lng === null ? "" : String(defaults.home_lng),
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("This browser doesn't expose Geolocation.");
      return;
    }
    setLocateError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        setLocateError(err.message || "Couldn't get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-800">
          Home location
        </legend>
        <p className="text-xs text-gray-500">
          Used to rank cheapest stores by travel cost. Leave blank to disable.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs text-gray-600">Latitude</span>
            <input
              name="home_lat"
              type="number"
              step="0.000001"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="3.1390"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
            {state.errors?.home_lat?.[0] && (
              <span className="block text-xs text-red-600">
                {state.errors.home_lat[0]}
              </span>
            )}
          </label>
          <label className="block">
            <span className="block text-xs text-gray-600">Longitude</span>
            <input
              name="home_lng"
              type="number"
              step="0.000001"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="101.6869"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
            {state.errors?.home_lng?.[0] && (
              <span className="block text-xs text-red-600">
                {state.errors.home_lng[0]}
              </span>
            )}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="text-xs text-green-700 underline disabled:opacity-60"
          >
            {locating ? "Locating…" : "Use my current location"}
          </button>
          {locateError && (
            <span className="text-xs text-red-600">{locateError}</span>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-800">
          Travel cost model
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs text-gray-600">
              Petrol RM / km
            </span>
            <input
              name="petrol_cost_per_km_myr"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={defaults.petrol_cost_per_km_myr}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-600">
              Time RM / hour
            </span>
            <input
              name="time_value_per_hour_myr"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={defaults.time_value_per_hour_myr}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-800">
          Gemini API key
        </legend>
        <p className="text-xs text-gray-500">
          Optional — enables &ldquo;Smart Parse&rdquo; on receipt uploads. Stored
          per-user, RLS-locked. Leave blank to keep the existing key.
        </p>
        <input
          name="gemini_api_key"
          type="password"
          autoComplete="off"
          placeholder={
            defaults.gemini_api_key_present ? "•••••••• (set)" : "AIza…"
          }
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />
      </fieldset>

      {state.message && (
        <p
          className={`text-sm ${
            state.ok ? "text-green-700" : "text-red-600"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
