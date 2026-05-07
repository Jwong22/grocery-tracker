"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

export type TravelConfig = {
  home: LatLng;
  petrolPerKmMyr: number;
  timePerHourMyr: number;
};

type SortMode = "price" | "total";

export function SearchClient({ travel }: { travel: TravelConfig | null }) {
  const [query, setQuery] = useState("");
  const [packType, setPackType] = useState<PackType | "any">("any");
  const [brand, setBrand] = useState("");
  const [origin, setOrigin] = useState("");
  const [sort, setSort] = useState<SortMode>(travel ? "total" : "price");

  const enabled = query.trim().length >= 2;

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", query.trim(), packType, brand.trim(), origin.trim()],
    queryFn: () =>
      searchCheapest({
        query,
        packType,
        brand,
        origin,
      }),
    enabled,
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
      // Stores without coords have null totals — sort them last.
      return enriched.sort((a, b) => {
        const at = a.totalMyr ?? Number.POSITIVE_INFINITY;
        const bt = b.totalMyr ?? Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        return a.hit.priceMyr - b.hit.priceMyr;
      });
    }
    return enriched.sort((a, b) => a.hit.priceMyr - b.hit.priceMyr);
  }, [data, sort, travel]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block">
          <span className="block text-sm font-medium text-gray-800">
            What are you looking for?
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. carrot, "broccoli", milk'
            autoFocus
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </label>

        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600">
            More filters
          </summary>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="block">
              <span className="block text-xs text-gray-600">Pack type</span>
              <select
                value={packType}
                onChange={(e) =>
                  setPackType(e.target.value as PackType | "any")
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                <option value="any">Any</option>
                {PACK_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-gray-600">Brand</span>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="any"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-600">Origin</span>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="any"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              />
            </label>
          </div>
        </details>

        {travel && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Sort by</span>
            <button
              type="button"
              onClick={() => setSort("total")}
              className={`px-2 py-0.5 rounded-full border ${
                sort === "total"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Total (incl. travel)
            </button>
            <button
              type="button"
              onClick={() => setSort("price")}
              className={`px-2 py-0.5 rounded-full border ${
                sort === "price"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Cheapest price
            </button>
          </div>
        )}
      </div>

      {!enabled && (
        <p className="text-sm text-gray-500">
          Type at least 2 characters to search.
        </p>
      )}

      {enabled && isFetching && (
        <p className="text-sm text-gray-500">Searching…</p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
      )}

      {enabled && ranked.length === 0 && !isFetching && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No prices yet. Add one from{" "}
          <a className="text-green-700 underline" href="/add/price">
            Record a price
          </a>
          .
        </div>
      )}

      {enabled && ranked.length > 0 && (
        <ul className="space-y-2">
          {ranked.map(({ hit, estimate, totalMyr }) => (
            <ResultCard
              key={hit.entryId}
              hit={hit}
              estimate={estimate}
              totalMyr={totalMyr}
              showTotal={sort === "total" && travel !== null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultCard({
  hit,
  estimate,
  totalMyr,
  showTotal,
}: {
  hit: SearchHit;
  estimate: TravelEstimate | null;
  totalMyr: number | null;
  showTotal: boolean;
}) {
  const variantBits = [
    hit.variant.brand,
    hit.variant.originCountry,
    hit.variant.packSizeG ? `${hit.variant.packSizeG}g` : null,
    hit.variant.packType !== "loose" ? hit.variant.packType : null,
  ].filter(Boolean);

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">
          {hit.product.canonicalName}
        </div>
        {variantBits.length > 0 && (
          <div className="text-xs text-gray-500 truncate">
            {variantBits.join(" · ")}
          </div>
        )}
        <div className="text-sm text-gray-700 mt-1 truncate">
          {hit.store.name}
          {hit.store.chain ? ` · ${hit.store.chain}` : ""}
        </div>
        <div className="text-xs text-gray-400">
          Observed {relativeDate(hit.observedAt)}
        </div>
        {estimate ? (
          <div className="text-xs text-gray-500 mt-1">
            {estimate.oneWayKm.toFixed(1)} km away · +
            {myr.format(estimate.totalAddedMyr)} round-trip cost
          </div>
        ) : (
          <div className="text-xs mt-1">
            <a
              href={`/stores/${hit.store.id}`}
              className="text-amber-700 underline"
            >
              📍 set store location
            </a>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        {showTotal && totalMyr !== null ? (
          <>
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {myr.format(totalMyr)}
            </div>
            <div className="text-xs text-gray-500 tabular-nums">
              price {myr.format(hit.priceMyr)}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {myr.format(hit.priceMyr)}
            </div>
            {hit.unitPricePer100g !== null && (
              <div className="text-xs text-gray-500 tabular-nums">
                {myr.format(hit.unitPricePer100g)} / 100g
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
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
