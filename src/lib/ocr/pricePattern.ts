// Heuristic price extraction from OCR / PDF / generic text.
// Matches lines containing a price token like:
//   "RM 4.50", "RM4.50", "4.50", "MYR 12.30"
// and tries to associate the rest of the line as the product name.
//
// This is intentionally simple — receipts vary wildly. The user reviews and
// fixes any wrong rows before saving.

const PRICE_RE = /(?:RM|MYR)?\s*(\d{1,4}(?:[.,]\d{2}))(?!\d)/i;
const TRAILING_QTY_RE = /\b(\d+)\s*(?:x|×)\s*$/i;
const PACK_SIZE_RE = /\b(\d+(?:\.\d+)?)\s*(g|kg|ml|l|litre)\b/i;
const TRAILING_UNIT_RE = /\/\s*(pc|pcs|kg|g|ml|l|pkt|pack|bag)\.?$/i;
const META_RE = /^[A-Za-z][A-Za-z ]{1,15}\s*:\s*\S/;

export type ParsedPriceLine = {
  raw: string;
  productName: string;
  priceMyr: number;
  packSizeG: number | null;
};

export function parsePriceLines(text: string): ParsedPriceLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: ParsedPriceLine[] = [];
  let lastCandidateName = "";
  for (const line of lines) {
    const match = line.match(PRICE_RE);
    if (!match) {
      // Not a price line — remember it as a possible product-name source for
      // the next price line (price tags split name and price across rows).
      // Skip key:value metadata like "Country: China", "Grade: Grade 1".
      if (!META_RE.test(line)) lastCandidateName = line;
      continue;
    }
    const priceStr = match[1].replace(",", ".");
    const priceMyr = Number(priceStr);
    if (!Number.isFinite(priceMyr) || priceMyr <= 0 || priceMyr > 9999) continue;

    // Strip the price token from the line; what's left may be the name.
    let name = line.replace(match[0], "").trim();
    name = name.replace(TRAILING_QTY_RE, "").trim();
    name = name.replace(TRAILING_UNIT_RE, "").trim();
    name = name.replace(/^[\s\-–—:\/]+|[\s\-–—:\/]+$/g, "").trim();

    // If nothing useful remains, fall back to the previous non-metadata line.
    if (name.length < 3 && lastCandidateName) {
      name = lastCandidateName;
    }
    if (!name) continue;

    // Detect pack size in the name: "500g", "1.5 kg", "350 ml"
    const sizeMatch = name.match(PACK_SIZE_RE);
    let packSizeG: number | null = null;
    if (sizeMatch) {
      const n = Number(sizeMatch[1]);
      const unit = sizeMatch[2].toLowerCase();
      if (Number.isFinite(n)) {
        if (unit === "kg" || unit === "l" || unit === "litre") packSizeG = n * 1000;
        else packSizeG = n;
      }
    }

    out.push({ raw: line, productName: name, priceMyr, packSizeG });
    lastCandidateName = "";
  }
  return out;
}
