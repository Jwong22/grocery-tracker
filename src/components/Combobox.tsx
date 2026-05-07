"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

export type ComboboxItem = {
  id: string;
  label: string;
  hint?: string | null;
};

type Props = {
  label: string;
  placeholder?: string;
  value: ComboboxItem | null;
  onChange: (item: ComboboxItem | null) => void;
  search: (query: string) => Promise<ComboboxItem[]>;
  onCreate?: (name: string) => Promise<ComboboxItem>;
  required?: boolean;
  error?: string | null;
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
    <div className="space-y-1" ref={containerRef}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-800"
      >
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm text-gray-900">{value.label}</div>
            {value.hint && (
              <div className="truncate text-xs text-gray-500">{value.hint}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-500 hover:text-red-600 shrink-0"
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
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
              {loading && (
                <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
              )}
              {!loading && items.length === 0 && !showCreate && (
                <div className="px-3 py-2 text-xs text-gray-500">
                  {trimmed ? "No matches" : "Start typing to search"}
                </div>
              )}
              <ul className="max-h-60 overflow-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(item)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-900">{item.label}</span>
                      {item.hint && (
                        <span className="text-xs text-gray-500">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {showCreate && (
                <div className="border-t border-gray-100 p-1">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50 disabled:opacity-60"
                  >
                    <span className="text-base leading-none">+</span>
                    <span className="truncate">
                      {creating ? "Creating…" : `Create "${trimmed}"`}
                    </span>
                  </button>
                  {createError && (
                    <p className="px-3 pb-2 text-xs text-red-600">
                      {createError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
