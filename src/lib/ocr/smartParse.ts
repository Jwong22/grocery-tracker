"use client";

import type { BatchRow } from "@/app/add/price/batch/BatchReviewTable";

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const PROMPT = `You are a receipt-extraction assistant. From the attached receipt image, extract every grocery line item as a JSON array.

Return STRICT JSON with this shape:
[
  {
    "productName": "carrot",
    "brand": null,
    "originCountry": null,
    "packType": "loose",
    "packSizeG": 500,
    "priceMyr": 4.50
  }
]

Rules:
- packType is one of: loose, packet, bottle, can, bag, box, tray, bunch (default "loose").
- packSizeG: convert kg→1000g, ml→ml-as-grams approx, leave null if unknown.
- priceMyr is the line total in Malaysian Ringgit, numeric.
- Skip subtotal, tax, rounding, payment lines.
- Output ONLY the JSON array. No prose, no markdown fences.`;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("read failed"));
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function smartParseImage(
  file: File,
  apiKey: string,
  storeName: string,
): Promise<BatchRow[]> {
  if (!apiKey) throw new Error("Gemini API key not set");
  const b64 = await fileToBase64(file);
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: file.type || "image/jpeg", data: b64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  };

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
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
    // Sometimes Gemini wraps with prose despite instruction; try to find JSON block.
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
      };
    })
    .filter((r): r is BatchRow => r !== null);
}
