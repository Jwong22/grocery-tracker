"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils/cn";

export type PlaceHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
};

type Prediction = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
};

type Props = {
  label?: string;
  placeholder?: string;
  onPick: (hit: PlaceHit) => void;
};

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function PlaceSearch({
  label = "Search a place",
  placeholder = "e.g. Pavilion Bukit Jalil",
  onPick,
}: Props) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(newSessionToken());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const handle = setTimeout(() => {
      fetch("/api/places/autocomplete", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
        }),
      })
        .then(async (res) => {
          if (cancelled) return;
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setErr(json.error ?? `Search failed (${res.status})`);
            setItems([]);
            setLoading(false);
            return;
          }
          setItems(json.predictions ?? []);
          setErr(null);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          setErr(e instanceof Error ? e.message : "Search failed");
          setItems([]);
          setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(handle);
    };
  }, [query]);

  const handlePick = async (p: Prediction) => {
    setPicking(true);
    setErr(null);
    try {
      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: p.placeId,
          sessionToken: sessionTokenRef.current,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Details failed (${res.status})`);
      onPick({
        name: json.displayName || p.mainText || p.fullText,
        address: json.formattedAddress || "",
        lat: json.lat,
        lng: json.lng,
        placeId: json.placeId || p.placeId,
      });
      sessionTokenRef.current = newSessionToken();
      setQuery("");
      setItems([]);
      setOpen(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load place details");
    } finally {
      setPicking(false);
    }
  };

  const trimmed = query.trim();

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        id={inputId}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length >= 2) setLoading(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors",
          "placeholder:text-muted-foreground/70",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
        )}
      />
      {open && trimmed.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-1000 mt-1 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Searching…
            </div>
          )}
          {err && !loading && (
            <div className="px-3 py-2 text-xs text-destructive">{err}</div>
          )}
          {!loading && !err && items.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No matches
            </div>
          )}
          <ul className="max-h-72 overflow-auto">
            {items.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  disabled={picking}
                  onClick={() => handlePick(p)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-60"
                >
                  <span className="text-sm text-foreground">
                    {p.mainText || p.fullText}
                  </span>
                  {p.secondaryText && (
                    <span className="text-xs text-muted-foreground">
                      {p.secondaryText}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
