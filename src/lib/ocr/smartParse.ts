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
    // Salvage either an object {...} or a bare array [...] from noisy output.
    const objStart = text.indexOf("{");
    const objEnd = text.lastIndexOf("}");
    const arrStart = text.indexOf("[");
    const arrEnd = text.lastIndexOf("]");
    if (objStart !== -1 && objEnd !== -1 && objStart < objEnd) {
      parsed = JSON.parse(text.slice(objStart, objEnd + 1));
    } else if (arrStart !== -1 && arrEnd !== -1) {
      parsed = JSON.parse(text.slice(arrStart, arrEnd + 1));
    } else {
      throw new Error("Unparseable JSON");
    }
  }

  // New shape: { store: { name, address }, items: [...] }.
  // Old shape: [ ...items ]. Support both.
  let items: unknown[];
  let detectedStore = "";
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    items = Array.isArray(obj.items) ? obj.items : [];
    const store = obj.store;
    if (store && typeof store === "object") {
      const s = store as Record<string, unknown>;
      if (typeof s.name === "string") detectedStore = s.name.trim();
    }
  } else {
    throw new Error("Expected JSON object or array");
  }

  // Prefer the store read off the receipt header; fall back to the selected one.
  const resolvedStore = detectedStore || storeName;

  return items
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
        storeName: resolvedStore,
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
