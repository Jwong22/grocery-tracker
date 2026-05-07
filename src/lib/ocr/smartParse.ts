"use client";

import type { BatchRow } from "@/app/add/price/batch/BatchReviewTable";

export async function smartParseImage(
  file: File,
  storeName: string,
): Promise<BatchRow[]> {
  const fd = new FormData();
  fd.append("document", file, file.name);

  const res = await fetch("/api/smart-parse", { method: "POST", body: fd });
  if (!res.ok) {
    let message = `Smart Parse ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!text) throw new Error("Empty response from Gemini");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("Unparseable JSON");
    parsed = JSON.parse(text.slice(start, end + 1));
  }
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array");

  return parsed
    .map((row): BatchRow | null => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const name = typeof r.productName === "string" ? r.productName.trim() : "";
      const priceRaw = r.priceMyr;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : typeof priceRaw === "string"
          ? Number(priceRaw)
          : NaN;
      if (!name || !Number.isFinite(price)) return null;
      const packTypeRaw =
        typeof r.packType === "string" ? r.packType.toLowerCase() : "loose";
      return {
        productName: name,
        storeName,
        brand: typeof r.brand === "string" ? r.brand : "",
        originCountry:
          typeof r.originCountry === "string" ? r.originCountry : "",
        packType: (packTypeRaw as BatchRow["packType"]) || "loose",
        packSizeG:
          typeof r.packSizeG === "number"
            ? String(r.packSizeG)
            : typeof r.packSizeG === "string"
            ? r.packSizeG
            : "",
        priceMyr: String(price),
        observedAt: "",
        notes: "",
        source: "smart",
        evidencePaths: [],
      };
    })
    .filter((r): r is BatchRow => r !== null);
}
