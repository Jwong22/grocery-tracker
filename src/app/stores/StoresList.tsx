"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { StoreMarker } from "@/components/map/StoresMap";

const StoresMap = dynamic(() => import("@/components/map/StoresMap"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-xl border border-border bg-muted/30 grid place-items-center text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Store = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  unit: string | null;
  parent_store_id: string | null;
  parent_name: string | null;
  lat: number | null;
  lng: number | null;
};

export function StoresList({ stores }: { stores: Store[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmed) return stores;
    return stores.filter((s) => {
      const haystack = [
        s.name,
        s.chain ?? "",
        s.address ?? "",
        s.unit ?? "",
        s.parent_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [stores, trimmed]);

  const located: StoreMarker[] = filtered
    .filter((s): s is Store & { lat: number; lng: number } =>
      s.lat !== null && s.lng !== null,
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      hint: composeHint(s),
      lat: s.lat,
      lng: s.lng,
    }));

  const missingCount = filtered.length - located.length;

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search stores by name, chain, mall…"
      />

      <div className="h-72 sm:h-96 rounded-xl border border-border overflow-hidden isolate">
        <StoresMap stores={located} pendingPin={null} onSelect={(s) => goto(s.id)} />
      </div>

      {missingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {missingCount} store{missingCount === 1 ? "" : "s"} without a
          location. Open them below to drop a pin.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {stores.length === 0 ? (
            <>
              No stores yet. Add one from{" "}
              <Link className="text-primary hover:underline" href="/add/price">
                Record a price
              </Link>{" "}
              or use <span className="text-foreground">+ Add store</span> above.
            </>
          ) : (
            <>No stores match &ldquo;{query}&rdquo;.</>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/stores/${s.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {s.name}
                  </div>
                  {composeHint(s) && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {composeHint(s)}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs">
                  {s.lat !== null && s.lng !== null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-primary-soft-foreground">
                      <PinIcon />
                      pinned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                      no location
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function goto(id: string) {
  window.location.href = `/stores/${id}`;
}

function composeHint(s: Store): string | null {
  const bits: string[] = [];
  if (s.parent_name) bits.push(s.parent_name);
  if (s.unit) bits.push(s.unit);
  if (bits.length > 0) return bits.join(" · ");
  if (s.chain) return s.chain;
  return s.address;
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
