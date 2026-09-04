"use client";

import dynamic from "next/dynamic";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toaster";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Combobox, type ComboboxItem } from "@/components/Combobox";
import { PlaceSearch } from "@/components/map/PlaceSearch";
import { searchTopLevelStores } from "@/lib/queries/catalog";
import { updateStore, deleteStore, type StoreFormState, type StoreUsage } from "./actions";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-lg border border-border bg-muted/30 grid place-items-center text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

const initialState: StoreFormState = { ok: false };

type Props = {
  storeId: string;
  usage: StoreUsage;
  defaults: {
    name: string;
    chain: string | null;
    address: string | null;
    unit: string | null;
    lat: number | null;
    lng: number | null;
    parent: { id: string; name: string; address: string | null } | null;
  };
};

export function StoreForm({ storeId, usage, defaults }: Props) {
  const action = updateStore.bind(null, storeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const handledRef = useRef<StoreFormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const inUse = usage.total > 0;
  const usageParts: string[] = [];
  if (usage.prices) usageParts.push(`${usage.prices} price${usage.prices === 1 ? "" : "s"}`);
  if (usage.purchases)
    usageParts.push(`${usage.purchases} purchase${usage.purchases === 1 ? "" : "s"}`);
  if (usage.orders) usageParts.push(`${usage.orders} order${usage.orders === 1 ? "" : "s"}`);
  if (usage.childStores)
    usageParts.push(`${usage.childStores} sub-store${usage.childStores === 1 ? "" : "s"}`);
  const usageText = usageParts.join(", ");

  const onDelete = () => {
    startDelete(async () => {
      const res = await deleteStore(storeId);
      if (res.ok) {
        success("Store deleted.");
        router.push("/stores");
      } else {
        toastError(res.message ?? "Couldn't delete store.");
        setConfirmDelete(false);
      }
    });
  };

  useEffect(() => {
    if (handledRef.current === state) return;
    if (state.ok && state.message) {
      handledRef.current = state;
      success(state.message);
      // Return to the previous page after a short beat so the toast is seen.
      const t = setTimeout(() => {
        router.back();
      }, 700);
      return () => clearTimeout(t);
    } else if (!state.ok && state.message) {
      handledRef.current = state;
      toastError(state.message);
    }
  }, [state, success, toastError, router]);

  const [address, setAddress] = useState(defaults.address ?? "");
  const [lat, setLat] = useState<number | null>(defaults.lat);
  const [lng, setLng] = useState<number | null>(defaults.lng);
  const [parent, setParent] = useState<ComboboxItem | null>(
    defaults.parent
      ? {
          id: defaults.parent.id,
          label: defaults.parent.name,
          hint: defaults.parent.address,
        }
      : null,
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
        setLat(round6(pos.coords.latitude));
        setLng(round6(pos.coords.longitude));
        setLocating(false);
      },
      (err) => {
        setLocateError(err.message || "Couldn't get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const parentSearch = useCallback(
    async (q: string): Promise<ComboboxItem[]> => {
      const rows = await searchTopLevelStores(q);
      return rows
        .filter((r) => r.id !== storeId)
        .map((r) => ({
          id: r.id,
          label: r.name,
          hint: r.address ?? r.chain,
        }));
    },
    [storeId],
  );

  const handleMapPick = useCallback((p: { lat: number; lng: number }) => {
    setLat(round6(p.lat));
    setLng(round6(p.lng));
  }, []);

  const handlePlacePick = useCallback(
    (hit: { name: string; address: string; lat: number; lng: number }) => {
      setLat(round6(hit.lat));
      setLng(round6(hit.lng));
      setAddress((hit.address || hit.name).slice(0, 200));
    },
    [],
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-4">
        <Field label="Store name" required error={state.errors?.name?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="name"
              defaultValue={defaults.name}
              required
              invalid={Boolean(state.errors?.name?.[0])}
            />
          )}
        </Field>
        <Field label="Chain" error={state.errors?.chain?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="chain"
              defaultValue={defaults.chain ?? ""}
              placeholder="e.g. NSK, AEON, Lotus's"
              invalid={Boolean(state.errors?.chain?.[0])}
            />
          )}
        </Field>
        <Field label="Address" error={state.errors?.address?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="optional — auto-fills from place search"
              invalid={Boolean(state.errors?.address?.[0])}
            />
          )}
        </Field>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inside a mall?</CardTitle>
          <CardDescription>
            If this shop sits inside a mall (or other parent location), link to
            it and add the unit/lot. Leave blank for a standalone store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="hidden"
            name="parent_store_id"
            value={parent?.id ?? ""}
          />
          <Combobox
            label="Parent location (mall)"
            placeholder="Search the mall by name"
            value={parent}
            onChange={setParent}
            search={parentSearch}
          />
          <Field label="Unit / Lot" error={state.errors?.unit?.[0]}>
            {(p) => (
              <Input
                {...p}
                name="unit"
                defaultValue={defaults.unit ?? ""}
                placeholder="e.g. G-019, Lot 1F-23"
                invalid={Boolean(state.errors?.unit?.[0])}
              />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
          <CardDescription>
            Search for a place, drop a pin, or use your current location. Used
            for travel-cost ranking on Search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PlaceSearch onPick={handlePlacePick} />

          <LeafletMap lat={lat} lng={lng} onChange={handleMapPick} />

          <input
            type="hidden"
            name="lat"
            value={lat === null ? "" : String(lat)}
          />
          <input
            type="hidden"
            name="lng"
            value={lng === null ? "" : String(lng)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground tabular-nums">
              {lat !== null && lng !== null ? (
                <>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </>
              ) : (
                "No location set — tap the map or search above."
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(lat !== null || lng !== null) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLat(null);
                    setLng(null);
                  }}
                >
                  Clear
                </Button>
              )}
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
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {locating ? "Locating…" : "Use my location"}
              </Button>
            </div>
          </div>

          {(state.errors?.lat?.[0] || state.errors?.lng?.[0]) && (
            <p className="text-xs text-destructive">
              {state.errors?.lat?.[0] || state.errors?.lng?.[0]}
            </p>
          )}
          {locateError && (
            <p className="text-xs text-destructive">{locateError}</p>
          )}
        </CardContent>
      </Card>

      {!state.ok && state.message && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : "Save store"}
      </Button>

      <div className="border-t border-border/60 pt-4">
        {inUse ? (
          <p className="text-xs text-muted-foreground">
            This location is currently used by {usageText}. Remove or reassign
            those before it can be deleted.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Not used by any prices or purchases — safe to delete.
          </p>
        )}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={inUse || deleting}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete store
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this store?"
        description="This permanently removes the store. This can't be undone."
        confirmLabel="Delete store"
        busy={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
