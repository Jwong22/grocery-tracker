"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ocrImage } from "@/lib/ocr/tesseract";
import { extractPdfText } from "@/lib/ocr/parsePdf";
import { parseExcelFile } from "@/lib/ocr/parseExcel";
import { parsePriceLines } from "@/lib/ocr/pricePattern";
import { smartParseImage } from "@/lib/ocr/smartParse";
import {
  BatchReviewTable,
  emptyRow,
  type BatchRow,
} from "./BatchReviewTable";

type Stage = "idle" | "ocr" | "pdf" | "excel" | "smart";

export function BatchClient() {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultStore, setDefaultStore] = useState("");

  const appendRows = (next: BatchRow[]) => {
    setRows((cur) => [...cur, ...next]);
  };

  const handleImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStage("ocr");
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Reading ${f.name} (${i + 1}/${files.length})…`);
        const text = await ocrImage(f);
        const parsed = parsePriceLines(text);
        const newRows: BatchRow[] = parsed.map((p) => ({
          ...emptyRow("image", defaultStore),
          productName: p.productName,
          priceMyr: String(p.priceMyr),
          packSizeG: p.packSizeG ? String(p.packSizeG) : "",
          notes: p.raw,
        }));
        appendRows(newRows);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setStage("idle");
      setProgress(null);
    }
  };

  const handlePdf = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStage("pdf");
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Parsing ${f.name} (${i + 1}/${files.length})…`);
        const text = await extractPdfText(f);
        const parsed = parsePriceLines(text);
        const newRows: BatchRow[] = parsed.map((p) => ({
          ...emptyRow("file", defaultStore),
          productName: p.productName,
          priceMyr: String(p.priceMyr),
          packSizeG: p.packSizeG ? String(p.packSizeG) : "",
          notes: p.raw,
        }));
        appendRows(newRows);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF parse failed");
    } finally {
      setStage("idle");
      setProgress(null);
    }
  };

  const handleExcel = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStage("excel");
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Parsing ${f.name} (${i + 1}/${files.length})…`);
        const parsed = await parseExcelFile(f);
        const stamped = parsed.map((r) => ({
          ...r,
          storeName: r.storeName || defaultStore,
        }));
        appendRows(stamped);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Excel parse failed");
    } finally {
      setStage("idle");
      setProgress(null);
    }
  };

  const handleSmart = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStage("smart");
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again");

      const { data: settings } = await supabase
        .from("user_settings")
        .select("gemini_api_key")
        .eq("user_id", user.id)
        .maybeSingle();
      const key = settings?.gemini_api_key as string | null | undefined;
      if (!key)
        throw new Error(
          "Set your Gemini API key in Settings before using Smart Parse",
        );

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(
          `Asking Gemini about ${f.name} (${i + 1}/${files.length})…`,
        );
        const parsed = await smartParseImage(f, key, defaultStore);
        appendRows(parsed);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Smart Parse failed");
    } finally {
      setStage("idle");
      setProgress(null);
    }
  };

  const busy = stage !== "idle";

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="block text-sm font-medium text-gray-800">
          Default store for this batch
        </span>
        <input
          value={defaultStore}
          onChange={(e) => setDefaultStore(e.target.value)}
          placeholder="e.g. NSK Pandan Indah"
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />
        <span className="block text-xs text-gray-500 mt-1">
          Auto-applied to rows that don&rsquo;t have a store. You can override
          per-row.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <UploadButton
          label="📷 Photo / OCR"
          accept="image/*"
          capture="environment"
          multiple
          disabled={busy}
          onPick={handleImages}
        />
        <UploadButton
          label="✨ Smart Parse"
          accept="image/*"
          capture="environment"
          multiple
          disabled={busy}
          onPick={handleSmart}
          accent="amber"
        />
        <UploadButton
          label="📄 PDF"
          accept="application/pdf"
          multiple
          disabled={busy}
          onPick={handlePdf}
        />
        <UploadButton
          label="📊 Excel"
          accept=".xlsx,.xls,.csv"
          multiple
          disabled={busy}
          onPick={handleExcel}
        />
      </div>

      {progress && (
        <div className="text-sm text-gray-600" role="status">
          {progress}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {rows.length > 0 ? (
        <BatchReviewTable
          key={rows.length}
          initialRows={rows}
          defaultStore={defaultStore}
          onSaved={() => setRows([])}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Upload one or more files above. Detected rows will appear here for
          review before saving.
        </div>
      )}
    </div>
  );
}

type UploadProps = {
  label: string;
  accept: string;
  capture?: "user" | "environment";
  multiple?: boolean;
  disabled?: boolean;
  accent?: "green" | "amber";
  onPick: (files: FileList | null) => void;
};

function UploadButton({
  label,
  accept,
  capture,
  multiple,
  disabled,
  accent = "green",
  onPick,
}: UploadProps) {
  const colour =
    accent === "amber"
      ? "border-amber-300 text-amber-800 hover:bg-amber-50"
      : "border-green-300 text-green-800 hover:bg-green-50";
  return (
    <label
      className={`flex h-12 cursor-pointer items-center justify-center rounded-lg border ${colour} bg-white text-sm font-medium ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
