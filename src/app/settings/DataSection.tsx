"use client";

import { useState, useTransition } from "react";
import { importJson, type ImportResult } from "./importAction";

export function DataSection() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const text = await file.text();
        const res = await importJson(text);
        setResult(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-medium text-gray-800">Data</h2>
      <p className="text-xs text-gray-500">
        Export your purchase history + settings, or import a previous export.
        Catalog rows (products, stores) are created or matched by name.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/api/export"
          className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50"
          download
        >
          ⬇ Export JSON
        </a>

        <label
          className={`inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 cursor-pointer ${
            pending ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {pending ? "Importing…" : "⬆ Import JSON"}
          <input
            type="file"
            accept="application/json,.json"
            disabled={pending}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div
          className={`text-xs ${
            result.ok ? "text-green-700" : "text-amber-700"
          }`}
          role={result.ok ? "status" : "alert"}
        >
          Imported {result.inserted} purchase
          {result.inserted === 1 ? "" : "s"}.
          {result.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-600">
              {result.failed.slice(0, 5).map((f, i) => (
                <li key={i}>
                  {f.index >= 0 ? `Row ${f.index + 1}: ` : ""}
                  {f.message}
                </li>
              ))}
              {result.failed.length > 5 && (
                <li>…and {result.failed.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
