"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { uploadEvidenceFiles } from "@/lib/storage/uploadEvidence";
import { ocrImage } from "@/lib/ocr/tesseract";
import { extractPdfText } from "@/lib/ocr/parsePdf";
import { parseExcelFile } from "@/lib/ocr/parseExcel";
import { parsePriceLines } from "@/lib/ocr/pricePattern";
import { smartParseImage } from "@/lib/ocr/smartParse";
import { groqParseImage } from "@/lib/ocr/groqParse";
import { mergeProviderRows } from "@/lib/ocr/mergeRows";
import { compressImage } from "@/lib/utils/compressImage";
import {
  BatchReviewTable,
  emptyRow,
  todayLocalDate,
  type BatchRow,
} from "./BatchReviewTable";

type Stage = "idle" | "photo" | "pdf" | "excel";

export function BatchClient() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const autoTriggered = useRef(false);

  // Auto-open camera/gallery when navigated from FAB menu
  const source = searchParams.get("source");
  useEffect(() => {
    if (autoTriggered.current) return;
    if (source === "camera" || source === "gallery") {
      autoTriggered.current = true;

      // Check if photos were pre-loaded via sessionStorage (from FabMenu)
      const stored = sessionStorage.getItem("fab_photos");
      if (stored) {
        sessionStorage.removeItem("fab_photos");
        try {
          const photos = JSON.parse(stored) as { name: string; type: string; data: string }[];
          if (photos.length > 0) {
            // Convert data URLs back to Files and auto-process
            const files = photos.map((p) => {
              const arr = p.data.split(",");
              const bstr = atob(arr[1]);
              const n = bstr.length;
              const u8arr = new Uint8Array(n);
              for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
              return new File([u8arr], p.name, { type: p.type || "image/jpeg" });
            });
            const dt = new DataTransfer();
            files.forEach((f) => dt.items.add(f));
            handlePhoto(dt.files);
            return;
          }
        } catch {
          // Fall through to file input click
        }
      }

      // Fallback: open file picker
      setTimeout(() => {
        photoInputRef.current?.click();
      }, 300);
    }
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const appendRows = (next: BatchRow[]) => {
    const today = todayLocalDate();
    const stamped = next.map((r) => ({
      ...r,
      observedAt: r.observedAt || today,
    }));
    setRows((cur) => [...cur, ...stamped]);
  };

  // Upload a single source file to the receipts bucket and return its storage
  // path. Returns null on failure so parsing can still proceed.
  const uploadSource = async (file: File): Promise<string | null> => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { paths } = await uploadEvidenceFiles(supabase, user.id, [file]);
      return paths[0] ?? null;
    } catch {
      return null;
    }
  };

  const stamp = (rows: BatchRow[], path: string | null): BatchRow[] =>
    path ? rows.map((r) => ({ ...r, evidencePaths: [path] })) : rows;

  const handlePhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setStage("photo");
    setError(null);
    try {
      let totalParsed = 0;
      for (let i = 0; i < list.length; i++) {
        const raw = list[i];
        setProgress(
          `Compressing & analysing ${raw.name} (${i + 1}/${list.length})…`,
        );

        // Compress image to max 1600px — drastically reduces upload/API time
        const f = await compressImage(raw);

        const [tessRes, gemRes, groqRes, uploadRes] = await Promise.allSettled([
          (async () => {
            const text = await ocrImage(f);
            return parsePriceLines(text).map<BatchRow>((p) => ({
              ...emptyRow("image", ""),
              productName: p.productName,
              priceMyr: String(p.priceMyr),
              packSizeG: p.packSizeG ? String(p.packSizeG) : "",
              notes: p.raw,
            }));
          })(),
          smartParseImage(f, ""),
          groqParseImage(f, ""),
          uploadSource(f),
        ]);

        const tessRows = tessRes.status === "fulfilled" ? tessRes.value : [];
        const gemRows = gemRes.status === "fulfilled" ? gemRes.value : [];
        const groqRows = groqRes.status === "fulfilled" ? groqRes.value : [];
        const sourcePath =
          uploadRes.status === "fulfilled" ? uploadRes.value : null;

        const merged = stamp(
          mergeProviderRows(tessRows, gemRows, groqRows),
          sourcePath,
        );
        totalParsed += merged.length;
        appendRows(merged);
      }
      if (totalParsed === 0) {
        setError(
          "No prices detected by Gemini, Llama, or local OCR. Try a clearer photo.",
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Photo parse failed");
    } finally {
      setStage("idle");
      setProgress(null);
    }
  };

  const handlePdf = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setStage("pdf");
    setError(null);
    try {
      let totalParsed = 0;
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        setProgress(`Parsing ${f.name} (${i + 1}/${list.length})…`);
        const [textRes, uploadRes] = await Promise.allSettled([
          extractPdfText(f),
          uploadSource(f),
        ]);
        const text = textRes.status === "fulfilled" ? textRes.value : "";
        const sourcePath =
          uploadRes.status === "fulfilled" ? uploadRes.value : null;
        const parsed = parsePriceLines(text);
        totalParsed += parsed.length;
        const newRows: BatchRow[] = parsed.map((p) => ({
          ...emptyRow("file", ""),
          productName: p.productName,
          priceMyr: String(p.priceMyr),
          packSizeG: p.packSizeG ? String(p.packSizeG) : "",
          notes: p.raw,
        }));
        appendRows(stamp(newRows, sourcePath));
      }
      if (totalParsed === 0) {
        setError("No prices detected in PDF.");
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
    const list = Array.from(files);
    setStage("excel");
    setError(null);
    try {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        setProgress(`Parsing ${f.name} (${i + 1}/${list.length})…`);
        const [parsedRes, uploadRes] = await Promise.allSettled([
          parseExcelFile(f),
          uploadSource(f),
        ]);
        const parsed = parsedRes.status === "fulfilled" ? parsedRes.value : [];
        const sourcePath =
          uploadRes.status === "fulfilled" ? uploadRes.value : null;
        const stamped = parsed.map((r) => ({
          ...r,
          storeName: r.storeName,
        }));
        appendRows(stamp(stamped, sourcePath));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Excel parse failed");
    } finally {
      setStage("idle");
      setProgress(null);
    }
  };

  const busy = stage !== "idle";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <UploadButton
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          }
          label="Photo / Gallery"
          accept="image/*"
          multiple
          disabled={busy}
          onPick={handlePhoto}
          accent="accent"
          inputRef={photoInputRef}
          capture={source === "camera" ? "environment" : undefined}
        />
        <UploadButton
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          }
          label="PDF"
          accept="application/pdf"
          multiple
          disabled={busy}
          onPick={handlePdf}
        />
        <UploadButton
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
          }
          label="Excel"
          accept=".xlsx,.xls,.csv"
          multiple
          disabled={busy}
          onPick={handleExcel}
        />
      </div>

      {progress && (
        <div className="text-sm text-muted-foreground" role="status">
          {progress}
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {rows.length > 0 ? (
        <BatchReviewTable rows={rows} setRows={setRows} />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Upload one or more files above. Detected rows will appear here for
          review before saving.
        </div>
      )}
    </div>
  );
}

type UploadProps = {
  icon: React.ReactNode;
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  accent?: "primary" | "accent";
  onPick: (files: FileList | null) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  capture?: "user" | "environment";
};

function UploadButton({
  icon,
  label,
  accept,
  multiple,
  disabled,
  accent = "primary",
  onPick,
  inputRef,
  capture,
}: UploadProps) {
  const colour =
    accent === "accent"
      ? "border-accent/40 text-accent hover:bg-accent-soft"
      : "border-border text-foreground hover:bg-muted";
  return (
    <label
      className={cn(
        "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium transition-colors",
        colour,
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      {icon}
      <span>{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        capture={capture}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
