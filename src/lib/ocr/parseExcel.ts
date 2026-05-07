"use client";

import type { BatchRow } from "@/app/add/price/batch/BatchReviewTable";

// Expected columns (case-insensitive, spaces and underscores ignored):
//   product, store, price, pack_size_g, pack_type, brand, origin, observed_at, notes
// Any row missing both `product` and `price` is skipped.

const COLUMN_ALIASES: Record<keyof BatchRow, string[]> = {
  productName: ["product", "productname", "name", "item"],
  storeName: ["store", "storename", "shop", "location"],
  priceMyr: ["price", "pricemyr", "rm", "myr", "amount"],
  packSizeG: ["packsizeg", "packsize", "size", "weight", "grams", "g"],
  packType: ["packtype", "type", "form"],
  brand: ["brand", "make"],
  originCountry: ["origin", "country", "originCountry", "origincountry"],
  observedAt: ["observedat", "date", "observed", "when"],
  notes: ["notes", "remark", "comment"],
  source: [],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]/g, "");
}

export async function parseExcelFile(file: File): Promise<BatchRow[]> {
  const xlsx = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = xlsx.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = wb.Sheets[firstSheetName];
  const records = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (records.length === 0) return [];

  const headerKeys = Object.keys(records[0]);
  const headerToField = new Map<string, keyof BatchRow>();
  for (const key of headerKeys) {
    const norm = normalize(key);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [
      keyof BatchRow,
      string[],
    ][]) {
      if (aliases.includes(norm)) {
        headerToField.set(key, field);
        break;
      }
    }
  }

  const rows: BatchRow[] = [];
  for (const r of records) {
    const row: BatchRow = {
      productName: "",
      storeName: "",
      brand: "",
      originCountry: "",
      packType: "loose",
      packSizeG: "",
      priceMyr: "",
      observedAt: "",
      notes: "",
      source: "file",
    };
    for (const [key, field] of headerToField.entries()) {
      const raw = r[key];
      const v = raw === null || raw === undefined ? "" : String(raw).trim();
      if (field === "packType") {
        row.packType = (v.toLowerCase() as BatchRow["packType"]) || "loose";
      } else if (field === "source") {
        // ignore
      } else {
        row[field] = v;
      }
    }
    if (!row.productName.trim() && !row.priceMyr.trim()) continue;
    rows.push(row);
  }
  return rows;
}
