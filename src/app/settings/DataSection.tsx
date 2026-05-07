"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data</CardTitle>
        <CardDescription>
          Export your purchase history + settings, or import a previous export.
          Catalog rows (products, stores) are created or matched by name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/export"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            download
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export JSON
          </a>

          <label
            className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer ${
              pending ? "opacity-60 cursor-not-allowed" : ""
            }`}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {pending ? "Importing…" : "Import JSON"}
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
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div
            className={`text-xs ${
              result.ok ? "text-primary-soft-foreground" : "text-accent-soft-foreground"
            }`}
            role={result.ok ? "status" : "alert"}
          >
            Imported {result.inserted} purchase
            {result.inserted === 1 ? "" : "s"}.
            {result.failed.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-destructive">
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
      </CardContent>
    </Card>
  );
}
