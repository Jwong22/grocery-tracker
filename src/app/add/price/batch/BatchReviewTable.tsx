"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Badge } from "@/components/ui/Badge";
import { Combobox, type ComboboxItem } from "@/components/Combobox";
import { StoreMapPicker } from "@/components/map/StoreMapPicker";
import { searchStores, type StoreRow } from "@/lib/queries/catalog";
import { createStoreAction } from "@/app/add/price/actions";
import { PACK_TYPES, type PackType } from "@/lib/zod/schemas";
import { submitBatch, type BatchSubmitResult } from "./actions";

export type BatchRow = {
  productName: string;
  storeName: string;
  brand: string;
  originCountry: string;
  packType: PackType;
  packSizeG: string;
  priceMyr: string;
  observedAt: string;
  notes: string;
  source: "manual" | "image" | "file" | "smart";
  evidencePaths: string[];
};

export function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyRow(
  source: BatchRow["source"] = "manual",
  storeName = "",
): BatchRow {
  return {
    productName: "",
    storeName,
    brand: "",
    originCountry: "",
    packType: "loose",
    packSizeG: "",
    priceMyr: "",
    observedAt: todayLocalDate(),
    notes: "",
    source,
    evidencePaths: [],
  };
}

type Props = {
  rows: BatchRow[];
  setRows: React.Dispatch<React.SetStateAction<BatchRow[]>>;
  defaultStore?: string;
};

export function BatchReviewTable({
  rows,
  setRows,
  defaultStore = "",
}: Props) {
  const [storeItem, setStoreItem] = useState<ComboboxItem | null>(
    defaultStore ? { id: "", label: defaultStore, hint: null } : null,
  );
  // mapOpen: null = closed, "default" = picking default store, number = picking for that row index
  const [mapOpen, setMapOpen] = useState<"default" | number | null>(null);
  const [rowStoreItems, setRowStoreItems] = useState<
    Record<number, ComboboxItem | null>
  >({});
  const storeOverride = storeItem?.label ?? "";
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BatchSubmitResult | null>(null);

  const storeSearch = useCallback(
    async (q: string): Promise<ComboboxItem[]> => {
      const results = await searchStores(q);
      return results.map((r) => ({
        id: r.id,
        label: r.name,
        hint: storeHint(r),
      }));
    },
    [],
  );

  const storeCreate = useCallback(
    (name: string) => createStoreAction(name),
    [],
  );

  const updateRow = (i: number, patch: Partial<BatchRow>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const setRowStoreItem = (i: number, item: ComboboxItem | null) => {
    setRowStoreItems((m) => ({ ...m, [i]: item }));
    updateRow(i, { storeName: item?.label ?? "" });
  };

  const removeRow = (i: number) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    setRowStoreItems((m) => {
      const next: Record<number, ComboboxItem | null> = {};
      Object.entries(m).forEach(([k, v]) => {
        const idx = Number(k);
        if (idx < i) next[idx] = v;
        else if (idx > i) next[idx - 1] = v;
      });
      return next;
    });
  };

  const addRow = () => setRows((rs) => [...rs, emptyRow("manual")]);

  const applyDefaultStore = () => {
    if (!storeOverride.trim()) return;
    setRows((rs) =>
      rs.map((r) => ({ ...r, storeName: r.storeName || storeOverride })),
    );
  };

  const onSubmit = () => {
    setResult(null);
    const payload = rows
      .map((r) => ({
        productName: r.productName,
        storeName: r.storeName || storeOverride,
        brand: r.brand,
        originCountry: r.originCountry,
        packType: r.packType,
        packSizeG: r.packSizeG,
        priceMyr: r.priceMyr,
        observedAt: r.observedAt || undefined,
        notes: r.notes,
        source: r.source,
        evidencePaths: r.evidencePaths,
      }))
      .filter((r) => r.productName.trim() && r.priceMyr.toString().trim());

    if (payload.length === 0) {
      setResult({
        ok: false,
        inserted: 0,
        failed: [{ index: -1, message: "Nothing to save." }],
      });
      return;
    }

    startTransition(async () => {
      const res = await submitBatch(payload);
      setResult(res);
      if (res.ok) {
        setRows([]);
      } else if (res.inserted > 0) {
        const failedIdx = new Set(res.failed.map((f) => f.index));
        setRows((rs) => rs.filter((_, i) => failedIdx.has(i)));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Combobox
              label="Default store (applied to blank rows)"
              placeholder="e.g. NSK Pandan Indah"
              value={storeItem}
              onChange={setStoreItem}
              search={storeSearch}
              onCreate={storeCreate}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={applyDefaultStore}
          >
            Apply to all
          </Button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMapOpen("default")}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <MapIcon /> Pick on map
          </button>
        </div>
      </div>

      <StoreMapPicker
        open={mapOpen !== null}
        onClose={() => setMapOpen(null)}
        onPick={(picked) => {
          if (mapOpen === "default") {
            setStoreItem(picked);
          } else if (typeof mapOpen === "number") {
            setRowStoreItem(mapOpen, picked);
          }
          setMapOpen(null);
        }}
      />

      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Row {i + 1}</span>
                <Badge tone="neutral" className="font-normal">
                  {row.source}
                </Badge>
                {row.evidencePaths.length > 0 && (
                  <Badge tone="neutral" className="font-normal inline-flex items-center gap-1">
                    <PaperclipIcon /> {row.evidencePaths.length}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RowInput
                label="Product"
                value={row.productName}
                onChange={(v) => updateRow(i, { productName: v })}
                required
              />
              <RowStoreField
                value={
                  rowStoreItems[i] ??
                  (row.storeName
                    ? { id: "", label: row.storeName, hint: null }
                    : null)
                }
                onChange={(item) => setRowStoreItem(i, item)}
                onPickOnMap={() => setMapOpen(i)}
                search={storeSearch}
                onCreate={storeCreate}
                placeholder={storeOverride || "store name"}
              />
              <RowInput
                label="Price (MYR)"
                value={row.priceMyr}
                onChange={(v) => updateRow(i, { priceMyr: v })}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
              />
              <RowInput
                label="Pack size (g)"
                value={row.packSizeG}
                onChange={(v) => updateRow(i, { packSizeG: v })}
                type="number"
                inputMode="decimal"
              />
              <RowDropdownField
                label="Pack type"
                value={row.packType}
                options={PACK_TYPES.map((p) => ({ value: p, label: p }))}
                onChange={(v) =>
                  updateRow(i, { packType: v as PackType })
                }
              />
              <RowInput
                label="Brand"
                value={row.brand}
                onChange={(v) => updateRow(i, { brand: v })}
              />
              <RowInput
                label="Origin"
                value={row.originCountry}
                onChange={(v) => updateRow(i, { originCountry: v })}
              />
              <RowDateField
                value={row.observedAt}
                onChange={(v) => updateRow(i, { observedAt: v })}
              />
            </div>
            <RowInput
              label="Notes"
              value={row.notes}
              onChange={(v) => updateRow(i, { notes: v })}
            />
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          + Add empty row
        </Button>
      </div>

      {result && (
        <div
          className={`text-sm ${
            result.ok ? "text-primary-soft-foreground" : "text-accent-soft-foreground"
          }`}
          role={result.ok ? "status" : "alert"}
        >
          Inserted {result.inserted}
          {result.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-destructive">
              {result.failed.map((f, idx) => (
                <li key={idx}>
                  {f.index >= 0 ? `Row ${f.index + 1}: ` : ""}
                  {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button
        type="button"
        size="lg"
        block
        onClick={onSubmit}
        disabled={pending}
      >
        {pending
          ? "Saving…"
          : `Save ${rows.length} ${rows.length === 1 ? "row" : "rows"}`}
      </Button>
    </div>
  );
}

type RowInputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  required?: boolean;
};

function RowInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  inputMode,
  placeholder,
  required,
}: RowInputProps) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      <Input
        type={type}
        step={step}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </label>
  );
}

type RowDropdownFieldProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
};

function RowDropdownField({
  label,
  value,
  options,
  onChange,
}: RowDropdownFieldProps) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <Dropdown
        value={value}
        options={options}
        onChange={onChange}
        size="sm"
        ariaLabel={label}
      />
    </div>
  );
}

type RowStoreFieldProps = {
  value: ComboboxItem | null;
  onChange: (item: ComboboxItem | null) => void;
  onPickOnMap: () => void;
  search: (q: string) => Promise<ComboboxItem[]>;
  onCreate: (name: string) => Promise<ComboboxItem>;
  placeholder?: string;
};

function RowStoreField({
  value,
  onChange,
  onPickOnMap,
  search,
  onCreate,
  placeholder,
}: RowStoreFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="block text-xs text-muted-foreground">Store</span>
        <button
          type="button"
          onClick={onPickOnMap}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Pick store on map"
        >
          <MapIcon /> Map
        </button>
      </div>
      <Combobox
        compact
        value={value}
        onChange={onChange}
        search={search}
        onCreate={onCreate}
        placeholder={placeholder}
      />
    </div>
  );
}

function storeHint(r: StoreRow): string | null {
  const bits: string[] = [];
  if (r.parent_name) bits.push(r.parent_name);
  if (r.unit) bits.push(r.unit);
  if (bits.length > 0) return bits.join(" · ");
  if (r.chain) return r.chain;
  return r.address;
}

type RowDateFieldProps = {
  value: string;
  onChange: (v: string) => void;
};

function toDateOnly(v: string): string {
  if (!v) return "";
  // strip any time portion if a legacy datetime-local value snuck in
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
}

function RowDateField({ value, onChange }: RowDateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dateValue = toDateOnly(value);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // fall through to focus
      }
    }
    el.focus();
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="block text-xs text-muted-foreground">
          Observed date
        </span>
        <button
          type="button"
          onClick={() => onChange(todayLocalDate())}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Today
        </button>
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          type="date"
          value={dateValue}
          onChange={(e) => onChange(e.target.value)}
          onClick={openPicker}
          className="h-9 pr-9 text-sm cursor-pointer"
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label="Open date picker"
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <CalendarIcon />
        </button>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden
    >
      <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.57-8.57a4 4 0 0 1 5.66 5.66l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.07-7.07" />
    </svg>
  );
}

function MapIcon() {
  return (
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
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </svg>
  );
}
