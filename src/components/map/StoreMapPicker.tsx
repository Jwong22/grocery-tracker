"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { PlaceSearch } from "@/components/map/PlaceSearch";
import { getAllStoresForMap, type StoreMapRow } from "@/lib/queries/catalog";
import { createStoreWithLocationAction } from "@/app/add/price/actions";
import type { StoreMarker } from "@/components/map/StoresMap";

const StoresMap = dynamic(() => import("@/components/map/StoresMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Picked = {
  id: string;
  label: string;
  hint: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (picked: Picked) => void;
};

export function StoreMapPicker({ open, onClose, onPick }: Props) {
  const [stores, setStores] = useState<StoreMapRow[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [pendingPin, setPendingPin] = useState<
    | { lat: number; lng: number; address: string | null; placeId: string | null }
    | null
  >(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loadedOnce) return;
    let cancelled = false;
    getAllStoresForMap()
      .then((rows) => {
        if (cancelled) return;
        setStores(rows);
        setLoadErr(null);
        setLoadedOnce(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadErr(e instanceof Error ? e.message : "Failed to load stores");
        setLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadedOnce]);

  const loading = open && !loadedOnce;

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
      hint: composeHint(s),
      lat: s.lat,
      lng: s.lng,
    }));

  const handleCreate = async () => {
    if (!pendingPin || newName.trim().length < 2) return;
    setCreating(true);
    setCreateErr(null);
    try {
      const created = await createStoreWithLocationAction({
        name: newName.trim(),
        address: pendingPin.address,
        lat: pendingPin.lat,
        lng: pendingPin.lng,
        place_id: pendingPin.placeId,
      });
      onPick({
        id: created.id,
        label: created.label,
        hint: created.hint ?? null,
      });
      onClose();
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : "Failed to create store");
    } finally {
      setCreating(false);
    }
  };

  const node = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-foreground/40 sm:p-4 sm:backdrop-blur-sm">
      <div className="flex flex-1 flex-col overflow-hidden bg-background sm:max-w-3xl sm:flex-none sm:h-[calc(100vh-4rem)] sm:w-full sm:rounded-xl sm:border sm:border-border sm:shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Pick a store on the map
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap a marker to select. Search a place or tap the map to add a
              new store there.
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

        <div className="border-b border-border p-3">
          <PlaceSearch
            label=""
            placeholder="Search e.g. Mid Valley Megamall"
            onPick={(hit) => {
              setPendingPin({
                lat: hit.lat,
                lng: hit.lng,
                address: hit.address || hit.name,
                placeId: hit.placeId,
              });
              setNewName(hit.name);
            }}
          />
        </div>

        <div className="relative isolate flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background/70 text-xs text-muted-foreground">
              Loading stores…
            </div>
          )}
          {loadErr && (
            <div className="absolute inset-x-0 top-2 z-10 mx-auto w-fit rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              {loadErr}
            </div>
          )}
          <StoresMap
            stores={located}
            pendingPin={pendingPin}
            initialCenter={pendingPin ?? undefined}
            onSelect={(s) => {
              onPick({ id: s.id, label: s.name, hint: s.hint });
              onClose();
            }}
            onMapClick={(p) =>
              setPendingPin({
                lat: p.lat,
                lng: p.lng,
                address: null,
                placeId: null,
              })
            }
          />
        </div>

        {pendingPin && (
          <div className="border-t border-border p-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              New store at{" "}
              <span className="tabular-nums">
                {pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)}
              </span>
              {pendingPin.address && (
                <>
                  {" — "}
                  <span className="text-foreground">{pendingPin.address}</span>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Field label="Store name" required>
                  {(p) => (
                    <Input
                      {...p}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. NSK Pandan Indah"
                    />
                  )}
                </Field>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingPin(null);
                    setNewName("");
                    setCreateErr(null);
                  }}
                >
                  Cancel pin
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating || newName.trim().length < 2}
                >
                  {creating ? "Creating…" : "Add new store here"}
                </Button>
              </div>
            </div>
            {createErr && (
              <p className="text-xs text-destructive">{createErr}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

function composeHint(s: StoreMapRow): string | null {
  const bits: string[] = [];
  if (s.parent_name) bits.push(s.parent_name);
  if (s.unit) bits.push(s.unit);
  if (bits.length > 0) return bits.join(" · ");
  if (s.chain) return s.chain;
  return s.address;
}
