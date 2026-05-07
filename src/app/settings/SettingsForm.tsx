"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { HomeLocationPicker } from "@/components/map/HomeLocationPicker";
import { saveSettings, type SettingsState } from "./actions";

const initialState: SettingsState = { ok: false };

type Props = {
  defaults: {
    home_lat: number | null;
    home_lng: number | null;
    petrol_cost_per_km_myr: number;
    time_value_per_hour_myr: number;
    gemini_api_key_present: boolean;
    groq_api_key_present: boolean;
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
  const [mapOpen, setMapOpen] = useState(false);

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const initialPin =
    Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && lat !== "" && lng !== ""
      ? { lat: parsedLat, lng: parsedLng }
      : null;

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Home location</CardTitle>
          <CardDescription>
            Used to rank cheapest stores by travel cost. Leave blank to disable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" error={state.errors?.home_lat?.[0]}>
              {(p) => (
                <Input
                  {...p}
                  name="home_lat"
                  type="number"
                  step="0.000001"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="3.1390"
                  invalid={Boolean(state.errors?.home_lat?.[0])}
                />
              )}
            </Field>
            <Field label="Longitude" error={state.errors?.home_lng?.[0]}>
              {(p) => (
                <Input
                  {...p}
                  name="home_lng"
                  type="number"
                  step="0.000001"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="101.6869"
                  invalid={Boolean(state.errors?.home_lng?.[0])}
                />
              )}
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={useMyLocation}
              disabled={locating}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {locating ? "Locating…" : "Use my current location"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMapOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
                <line x1="8" y1="3" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="21" />
              </svg>
              Pick on map
            </Button>
            {locateError && (
              <span className="text-xs text-destructive">{locateError}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {mapOpen && (
        <HomeLocationPicker
          open
          initial={initialPin}
          onClose={() => setMapOpen(false)}
          onPick={({ lat: pickedLat, lng: pickedLng }) => {
            setLat(pickedLat.toFixed(6));
            setLng(pickedLng.toFixed(6));
            setLocateError(null);
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Travel cost model</CardTitle>
          <CardDescription>
            How much each kilometre and hour of shopping is worth to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Petrol RM / km">
              {(p) => (
                <Input
                  {...p}
                  name="petrol_cost_per_km_myr"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  defaultValue={defaults.petrol_cost_per_km_myr}
                />
              )}
            </Field>
            <Field label="Time RM / hour">
              {(p) => (
                <Input
                  {...p}
                  name="time_value_per_hour_myr"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  defaultValue={defaults.time_value_per_hour_myr}
                />
              )}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gemini API key</CardTitle>
          <CardDescription>
            Optional override. Smart Parse uses the server&rsquo;s default key
            unless you set your own here (uses your personal free quota
            instead). Free tier at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              aistudio.google.com/app/apikey
            </a>
            . Stored per-user, RLS-locked. Leave blank to keep the existing key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="API key">
            {(p) => (
              <Input
                {...p}
                name="gemini_api_key"
                type="password"
                autoComplete="off"
                placeholder={
                  defaults.gemini_api_key_present ? "•••••••• (set)" : "AIza…"
                }
              />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Groq API key</CardTitle>
          <CardDescription>
            Optional override. Powers the &ldquo;Llama Vision&rdquo; button —
            useful as a second opinion alongside Smart Parse. Server uses its
            own default key unless you set yours here. Free, no card required at{" "}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              console.groq.com/keys
            </a>
            . Leave blank to keep the existing key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="API key">
            {(p) => (
              <Input
                {...p}
                name="groq_api_key"
                type="password"
                autoComplete="off"
                placeholder={
                  defaults.groq_api_key_present ? "•••••••• (set)" : "gsk_…"
                }
              />
            )}
          </Field>
        </CardContent>
      </Card>

      {state.message && (
        <p
          className={`text-sm ${
            state.ok ? "text-primary-soft-foreground" : "text-destructive"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
