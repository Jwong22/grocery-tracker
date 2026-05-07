"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { PlaceSearch } from "@/components/map/PlaceSearch";
import { getAllStoresForMap, type StoreMapRow } from "@/lib/queries/catalog";
import type { StoreMarker } from "@/components/map/StoresMap";

const StoresMap = dynamic(() => import("@/components/map/StoresMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Props = {
  open: boolean;
  initial?: { lat: number; lng: number } | null;
  onClose: () => void;
  onPick: (p: { lat: number; lng: number; address: string | null }) => void;
};

export function HomeLocationPicker({ open, initial, onClose, onPick }: Props) {
  const [stores, setStores] = useState<StoreMapRow[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [pendingPin, setPendingPin] = useState<
    { lat: number; lng: number; address: string | null } | null
  >(initial ? { lat: initial.lat, lng: initial.lng, address: null } : null);
  const [locating, setLocating] = useState(false);
  const [locateErr, setLocateErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loadedOnce) return;
    let cancelled = false;
    getAllStoresForMap()
      .then((rows) => {
        if (!cancelled) {
          setStores(rows);
          setLoadedOnce(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadedOnce]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const located: StoreMarker[] = stores
    .filter((s): s is StoreMapRow & { lat: number; lng: number } =>
      s.lat !== null && s.lng !== null,
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      hint: s.chain ?? s.address,
      lat: s.lat,
      lng: s.lng,
    }));

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateErr("This browser doesn't expose Geolocation.");
      return;
    }
    setLocateErr(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingPin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: null,
        });
        setLocating(false);
      },
      (err) => {
        setLocateErr(err.message || "Couldn't get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const confirm = () => {
    if (!pendingPin) return;
    onPick(pendingPin);
    onClose();
  };

  const node = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-foreground/40 sm:p-4 sm:backdrop-blur-sm">
      <div className="flex flex-1 flex-col overflow-hidden bg-background sm:max-w-3xl sm:flex-none sm:h-[calc(100vh-4rem)] sm:w-full sm:rounded-xl sm:border sm:border-border sm:shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Pick your home location
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search a place or tap the map. Your stores are shown for context.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="border-b border-border p-3 space-y-2">
          <PlaceSearch
            label=""
            placeholder="Search e.g. Pandan Indah, Kuala Lumpur"
            onPick={(hit) => {
              setPendingPin({
                lat: hit.lat,
                lng: hit.lng,
                address: hit.address || hit.name,
              });
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
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
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {locating ? "Locating…" : "Use my current location"}
            </Button>
            {locateErr && (
              <span className="text-xs text-destructive">{locateErr}</span>
            )}
          </div>
        </div>

        <div className="relative isolate flex-1">
          <StoresMap
            stores={located}
            pendingPin={pendingPin}
            initialCenter={pendingPin ?? undefined}
            onSelect={() => {}}
            onMapClick={(p) =>
              setPendingPin({ lat: p.lat, lng: p.lng, address: null })
            }
          />
        </div>

        <div className="border-t border-border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {pendingPin ? (
              <>
                Selected{" "}
                <span className="tabular-nums text-foreground">
                  {pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)}
                </span>
                {pendingPin.address && (
                  <>
                    {" — "}
                    <span className="text-foreground">{pendingPin.address}</span>
                  </>
                )}
              </>
            ) : (
              "Tap the map or search to place a pin."
            )}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirm}
              disabled={!pendingPin}
            >
              Use this location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
