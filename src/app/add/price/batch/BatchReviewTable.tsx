"use client";

import { useState, useTransition } from "react";
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
};

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
    observedAt: "",
    notes: "",
    source,
  };
}

type Props = {
  initialRows: BatchRow[];
  defaultStore?: string;
  onSaved?: () => void;
};

export function BatchReviewTable({
  initialRows,
  defaultStore = "",
  onSaved,
}: Props) {
  const [storeOverride, setStoreOverride] = useState(defaultStore);
  const [rows, setRows] = useState<BatchRow[]>(() =>
    initialRows.length > 0 ? initialRows : [emptyRow()],
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BatchSubmitResult | null>(null);

  const updateRow = (i: number, patch: Partial<BatchRow>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

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
        setRows([emptyRow()]);
        onSaved?.();
      } else if (res.inserted > 0) {
        // Keep only the failed rows for retry
        const failedIdx = new Set(res.failed.map((f) => f.index));
        setRows((rs) => rs.filter((_, i) => failedIdx.has(i)));
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="block flex-1">
          <span className="block text-xs text-gray-600">
            Default store (applied to blank rows)
          </span>
          <input
            value={storeOverride}
            onChange={(e) => setStoreOverride(e.target.value)}
            placeholder="e.g. NSK Pandan Indah"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={applyDefaultStore}
          className="text-xs text-green-700 underline"
        >
          Apply to all
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Row {i + 1}{" "}
                <span className="text-gray-400">· {row.source}</span>
              </span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Product"
                value={row.productName}
                onChange={(v) => updateRow(i, { productName: v })}
                required
              />
              <Input
                label="Store"
                value={row.storeName}
                onChange={(v) => updateRow(i, { storeName: v })}
                placeholder={storeOverride || "store name"}
              />
              <Input
                label="Price (MYR)"
                value={row.priceMyr}
                onChange={(v) => updateRow(i, { priceMyr: v })}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
              />
              <Input
                label="Pack size (g)"
                value={row.packSizeG}
                onChange={(v) => updateRow(i, { packSizeG: v })}
                type="number"
                inputMode="decimal"
              />
              <Select
                label="Pack type"
                value={row.packType}
                options={PACK_TYPES.map((p) => ({ value: p, label: p }))}
                onChange={(v) =>
                  updateRow(i, { packType: v as PackType })
                }
              />
              <Input
                label="Brand"
                value={row.brand}
                onChange={(v) => updateRow(i, { brand: v })}
              />
              <Input
                label="Origin"
                value={row.originCountry}
                onChange={(v) => updateRow(i, { originCountry: v })}
              />
              <Input
                label="Observed at"
                value={row.observedAt}
                onChange={(v) => updateRow(i, { observedAt: v })}
                type="datetime-local"
              />
            </div>
            <Input
              label="Notes"
              value={row.notes}
              onChange={(v) => updateRow(i, { notes: v })}
            />
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-gray-700 underline"
        >
          + Add empty row
        </button>
      </div>

      {result && (
        <div
          className={`text-sm ${
            result.ok ? "text-green-700" : "text-amber-700"
          }`}
          role={result.ok ? "status" : "alert"}
        >
          Inserted {result.inserted}
          {result.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-600">
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

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="w-full h-12 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : `Save ${rows.length} ${rows.length === 1 ? "row" : "rows"}`}
      </button>
    </div>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  required?: boolean;
};

function Input({
  label,
  value,
  onChange,
  type = "text",
  step,
  inputMode,
  placeholder,
  required,
}: InputProps) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        step={step}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
      />
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
};

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
