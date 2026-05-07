"use client";

import { useActionState, useState } from "react";
import { updateStore, type StoreFormState } from "./actions";

const initialState: StoreFormState = { ok: false };

type Props = {
  storeId: string;
  defaults: {
    name: string;
    chain: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
};

export function StoreForm({ storeId, defaults }: Props) {
  const action = updateStore.bind(null, storeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [lat, setLat] = useState(
    defaults.lat === null ? "" : String(defaults.lat),
  );
  const [lng, setLng] = useState(
    defaults.lng === null ? "" : String(defaults.lng),
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
    <form action={formAction} className="space-y-4">
      <Field
        label="Store name"
        name="name"
        defaultValue={defaults.name}
        required
        error={state.errors?.name?.[0]}
      />
      <Field
        label="Chain"
        name="chain"
        defaultValue={defaults.chain ?? ""}
        placeholder="e.g. NSK, AEON, Lotus's"
        error={state.errors?.chain?.[0]}
      />
      <Field
        label="Address"
        name="address"
        defaultValue={defaults.address ?? ""}
        placeholder="optional"
        error={state.errors?.address?.[0]}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-800">Location</legend>
        <p className="text-xs text-gray-500">
          Used for travel-cost ranking. Tap &ldquo;Use this store&rsquo;s
          location&rdquo; while standing in the store, or paste lat/lng from
          Google Maps.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs text-gray-600">Latitude</span>
            <input
              name="lat"
              type="number"
              step="0.000001"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="3.1390"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
            {state.errors?.lat?.[0] && (
              <span className="block text-xs text-red-600">
                {state.errors.lat[0]}
              </span>
            )}
          </label>
          <label className="block">
            <span className="block text-xs text-gray-600">Longitude</span>
            <input
              name="lng"
              type="number"
              step="0.000001"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="101.6869"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
            {state.errors?.lng?.[0] && (
              <span className="block text-xs text-red-600">
                {state.errors.lng[0]}
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
            {locating ? "Locating…" : "Use this store's location"}
          </button>
          {locateError && (
            <span className="text-xs text-red-600">{locateError}</span>
          )}
        </div>
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
        {pending ? "Saving…" : "Save store"}
      </button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};

function Field({ label, error, name, ...rest }: FieldProps) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-gray-800">
        {label}
        {rest.required && <span className="text-red-600 ml-0.5">*</span>}
      </span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
