"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { searchCheapest, type SearchHit } from "@/lib/queries/search";
import { PACK_TYPES, type PackType } from "@/lib/zod/schemas";
import {
  estimateTravelCost,
  type LatLng,
  type TravelEstimate,
} from "@/lib/travel/cost";

const myr = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export type TravelConfig = {
  home: LatLng;
  petrolPerKmMyr: number;
  timePerHourMyr: number;
};

type SortMode = "price" | "total";

const PAGE_SIZE = 20;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}

export function SearchClient({ travel }: { travel: TravelConfig | null }) {
  const [query, setQuery] = useState("");
  const [packType, setPackType] = useState<PackType | "any">("any");
  const [brand, setBrand] = useState("");
  const [origin, setOrigin] = useState("");
  const [sort, setSort] = useState<SortMode>(travel ? "total" : "price");

  const debouncedQuery = useDebounce(query.trim(), 300);

  const viewKey = `${debouncedQuery}|${packType}|${brand.trim()}|${origin.trim()}|${sort}`;

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", debouncedQuery, packType, brand.trim(), origin.trim()],
    queryFn: () =>
      searchCheapest({
        query: debouncedQuery,
        packType,
        brand,
        origin,
      }),
    staleTime: 30_000,
  });

  const ranked = useMemo(() => {
    if (!data) return [];
    const enriched = data.map((hit) => {
      const estimate =
        travel && hit.store.lat !== null && hit.store.lng !== null
          ? estimateTravelCost({
              home: travel.home,
              store: { lat: hit.store.lat, lng: hit.store.lng },
              petrolPerKmMyr: travel.petrolPerKmMyr,
              timePerHourMyr: travel.timePerHourMyr,
            })
          : null;
      const total = estimate ? hit.priceMyr + estimate.totalAddedMyr : null;
      return { hit, estimate, totalMyr: total };
    });

    if (sort === "total" && travel) {
      return enriched.sort((a, b) => {
        const at = a.totalMyr ?? Number.POSITIVE_INFINITY;
        const bt = b.totalMyr ?? Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        return a.hit.priceMyr - b.hit.priceMyr;
      });
    }
    return enriched.sort((a, b) => a.hit.priceMyr - b.hit.priceMyr);
  }, [data, sort, travel]);

  // Travel-aware recommendation: is the absolute-cheapest actually worth it
  // once fuel + time are added? Only meaningful when travel is configured and
  // the compared results have location estimates.
  const recommendation = useMemo(() => {
    if (!travel || ranked.length < 2) return null;
    const withEstimate = ranked.filter(
      (r): r is { hit: SearchHit; estimate: TravelEstimate; totalMyr: number } =>
        r.estimate !== null && r.totalMyr !== null,
    );
    if (withEstimate.length < 2) return null;

    const cheapestByPrice = [...withEstimate].sort(
      (a, b) => a.hit.priceMyr - b.hit.priceMyr,
    )[0];
    const bestByTotal = [...withEstimate].sort(
      (a, b) => a.totalMyr - b.totalMyr,
    )[0];

    // Same store/entry wins both — the cheapest is also nearest-enough. Simple win.
    if (cheapestByPrice.hit.entryId === bestByTotal.hit.entryId) {
      return {
        sameWinner: true,
        best: bestByTotal,
        cheapest: cheapestByPrice,
        savings: 0,
      };
    }

    // The cheapest-by-price costs MORE overall once travel is added.
    const savings = cheapestByPrice.totalMyr - bestByTotal.totalMyr;
    return {
      sameWinner: false,
      best: bestByTotal,
      cheapest: cheapestByPrice,
      savings,
    };
  }, [ranked, travel]);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. carrot, "broccoli", milk'
            className="h-11 pl-9 text-base"
          />
        </div>

        <details className="group rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground select-none flex items-center justify-between">
            <span>More filters</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Field label="Pack type">
              {(p) => (
                <Dropdown
                  {...p}
                  value={packType}
                  onChange={(v) => setPackType(v as PackType | "any")}
                  options={[
                    { value: "any", label: "Any" },
                    ...PACK_TYPES.map((pt) => ({ value: pt, label: pt })),
                  ]}
                />
              )}
            </Field>
            <Field label="Brand">
              {(p) => (
                <Input
                  {...p}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="any"
                />
              )}
            </Field>
            <Field label="Origin">
              {(p) => (
                <Input
                  {...p}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="any"
                />
              )}
            </Field>
          </div>
        </details>

        {travel && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sort by</span>
            <div className="inline-flex rounded-full border border-border bg-card p-0.5">
              <SortChip
                active={sort === "total"}
                onClick={() => setSort("total")}
              >
                Total (incl. travel)
              </SortChip>
              <SortChip
                active={sort === "price"}
                onClick={() => setSort("price")}
              >
                Cheapest price
              </SortChip>
            </div>
          </div>
        )}
      </div>

      {isFetching && !data && (
        <p className="text-sm text-muted-foreground">Loading prices…</p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
      )}

      {ranked.length === 0 && !isFetching && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {debouncedQuery.length >= 2 ? (
            <>No matches for &ldquo;{debouncedQuery}&rdquo;.</>
          ) : (
            <>
              No prices yet. Add one from{" "}
              <a className="text-primary hover:underline" href="/add/price">
                Add entry
              </a>
              .
            </>
          )}
        </div>
      )}

      {recommendation && !recommendation.sameWinner && recommendation.savings > 0.01 && (
        <div className="rounded-xl border border-primary/40 bg-primary-soft/30 p-3.5">
          <div className="flex items-start gap-2.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0 text-primary mt-0.5"
              aria-hidden="true"
            >
              <path d="M12 2 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div className="text-sm text-foreground">
              <span className="font-medium">Best value:</span>{" "}
              {recommendation.best.hit.store.name} —{" "}
              {myr.format(recommendation.best.hit.priceMyr)} (
              {myr.format(recommendation.best.totalMyr)} incl. travel,{" "}
              {recommendation.best.estimate.oneWayKm.toFixed(1)} km).
              <div className="text-xs text-muted-foreground mt-1">
                The cheapest sticker price is{" "}
                {recommendation.cheapest.hit.store.name} at{" "}
                {myr.format(recommendation.cheapest.hit.priceMyr)} (
                {recommendation.cheapest.estimate.oneWayKm.toFixed(1)} km), but
                with fuel &amp; time it works out to{" "}
                {myr.format(recommendation.cheapest.totalMyr)} — about{" "}
                {myr.format(recommendation.savings)} more than going to{" "}
                {recommendation.best.hit.store.name}.
              </div>
            </div>
          </div>
        </div>
      )}

      {ranked.length > 0 && (
        <ResultsList
          key={viewKey}
          ranked={ranked}
          showTotal={sort === "total" && travel !== null}
        />
      )}
    </div>
  );
}

type RankedItem = {
  hit: SearchHit;
  estimate: TravelEstimate | null;
  totalMyr: number | null;
};

function ResultsList({
  ranked,
  showTotal,
}: {
  ranked: RankedItem[];
  showTotal: boolean;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  return (
    <>
      <ul className="space-y-2.5">
        {ranked.slice(0, visible).map(({ hit, estimate, totalMyr }, index) => (
          <ResultCard
            key={hit.entryId}
            hit={hit}
            estimate={estimate}
            totalMyr={totalMyr}
            showTotal={showTotal}
            isCheapest={index === 0}
          />
        ))}
      </ul>
      {visible < ranked.length && (
        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Show more
            <span className="text-xs text-muted-foreground">
              ({ranked.length - visible} more)
            </span>
          </button>
        </div>
      )}
    </>
  );
}

function SortChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ResultCard({
  hit,
  estimate,
  totalMyr,
  showTotal,
  isCheapest,
}: {
  hit: SearchHit;
  estimate: TravelEstimate | null;
  totalMyr: number | null;
  showTotal: boolean;
  isCheapest: boolean;
}) {
  const variantBits = [
    hit.variant.brand,
    hit.variant.originCountry,
    hit.variant.packSizeG ? `${hit.variant.packSizeG}g` : null,
    hit.variant.packType !== "loose" ? hit.variant.packType : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "relative rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 focus-within:ring-2 focus-within:ring-primary/30",
        isCheapest ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <Link
        href={`/prices/${hit.entryId}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`View price details for ${hit.product.canonicalName}`}
      />
      <div className="relative min-w-0 flex-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="font-medium text-foreground truncate">
            {hit.product.canonicalName}
          </div>
          {isCheapest && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground shrink-0">
              Best
            </span>
          )}
        </div>
        {variantBits.length > 0 && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {variantBits.join(" · ")}
          </div>
        )}
        <div className="text-sm mt-1.5 truncate">
          <a
            href={googleMapsUrl(hit.store)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative text-foreground hover:underline inline-flex items-center gap-1 pointer-events-auto"
            title="Open in Google Maps"
          >
            {hit.store.name}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 text-muted-foreground shrink-0"
              aria-hidden
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          {hit.store.chain ? (
            <span className="text-muted-foreground">
              {" · "}
              {hit.store.chain}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Observed {dateFmt.format(new Date(hit.observedAt))}
          <span className="text-muted-foreground/60">
            {" · "}
            {relativeDate(hit.observedAt)}
          </span>
        </div>
        {estimate ? (
          <div className="text-xs text-muted-foreground mt-1">
            {estimate.oneWayKm.toFixed(1)} km away · +
            {myr.format(estimate.totalAddedMyr)} round-trip cost
          </div>
        ) : (
          <div className="text-xs mt-1">
            <Link
              href={`/stores/${hit.store.id}`}
              className="relative inline-flex items-center gap-1 text-accent hover:underline pointer-events-auto"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Set store location
            </Link>
          </div>
        )}
      </div>
      <div className="relative text-right shrink-0 pointer-events-none">
        {showTotal && totalMyr !== null ? (
          <>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              {myr.format(totalMyr)}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              price {myr.format(hit.priceMyr)}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              {myr.format(hit.priceMyr)}
            </div>
            {hit.unitPricePer100g !== null && (
              <div className="text-xs text-muted-foreground tabular-nums">
                {myr.format(hit.unitPricePer100g)} / 100g
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function googleMapsUrl(store: {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}): string {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  const text = [store.name, store.address].filter(Boolean).join(", ");
  if (text) return `${base}${encodeURIComponent(text)}`;
  if (store.lat !== null && store.lng !== null) {
    return `${base}${store.lat},${store.lng}`;
  }
  return "https://www.google.com/maps/";
}

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
