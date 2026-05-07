"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "./ui/Label";

export type ComboboxItem = {
  id: string;
  label: string;
  hint?: string | null;
};

type Props = {
  label?: string;
  placeholder?: string;
  value: ComboboxItem | null;
  onChange: (item: ComboboxItem | null) => void;
  search: (query: string) => Promise<ComboboxItem[]>;
  onCreate?: (name: string) => Promise<ComboboxItem>;
  required?: boolean;
  error?: string | null;
  compact?: boolean;
};

export function Combobox({
  label,
  placeholder,
  value,
  onChange,
  search,
  onCreate,
  required,
  error,
  compact,
}: Props) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ComboboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const result = await search(query);
        if (!cancelled) setItems(result);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open, search]);

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

  const trimmed = query.trim();
  const showCreate =
    onCreate &&
    trimmed.length >= 2 &&
    !items.some((i) => i.label.toLowerCase() === trimmed.toLowerCase());

  const handlePick = (item: ComboboxItem) => {
    onChange(item);
    setQuery("");
    setOpen(false);
  };

  const handleCreate = () => {
    if (!onCreate) return;
    const name = trimmed;
    setCreateError(null);
    startCreate(async () => {
      try {
        const created = await onCreate(name);
        handlePick(created);
      } catch (e: unknown) {
        setCreateError(e instanceof Error ? e.message : "Failed to create");
      }
    });
  };

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5")} ref={containerRef}>
      {label !== undefined && (
        compact ? (
          <label
            htmlFor={inputId}
            className="block text-xs text-muted-foreground select-none"
          >
            {label}
            {required && (
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </label>
        ) : (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )
      )}

      {value ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg border border-border bg-card shadow-sm",
            compact ? "h-9 px-2.5 py-1" : "px-3 py-2",
          )}
        >
          <div className="min-w-0">
            <div className="truncate text-sm text-foreground">
              {value.label}
            </div>
            {value.hint && !compact && (
              <div className="truncate text-xs text-muted-foreground">
                {value.hint}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground hover:text-destructive shrink-0 px-1.5 py-1 rounded transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              "flex w-full rounded-lg border bg-card text-sm text-foreground transition-colors",
              compact ? "h-9 px-2.5 py-1" : "h-10 px-3 py-2",
              "placeholder:text-muted-foreground/70",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              error ? "border-destructive" : "border-border",
            )}
          />
          {open && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
              {loading && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Searching…
                </div>
              )}
              {!loading && items.length === 0 && !showCreate && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {trimmed ? "No matches" : "Start typing to search"}
                </div>
              )}
              <ul className="max-h-60 overflow-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(item)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {showCreate && (
                <div className="border-t border-border p-1">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-primary hover:bg-primary-soft disabled:opacity-60 transition-colors"
                  >
                    <span className="text-base leading-none">+</span>
                    <span className="truncate">
                      {creating ? "Creating…" : `Create "${trimmed}"`}
                    </span>
                  </button>
                  {createError && (
                    <p className="px-3 pb-2 text-xs text-destructive">
                      {createError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
