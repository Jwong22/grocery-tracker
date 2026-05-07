import type { BatchRow } from "@/app/add/price/batch/BatchReviewTable";

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function rowsMatch(a: BatchRow, b: BatchRow): boolean {
  const pa = parseFloat(a.priceMyr);
  const pb = parseFloat(b.priceMyr);
  if (!Number.isFinite(pa) || !Number.isFinite(pb)) return false;
  if (Math.abs(pa - pb) > 0.05) return false;
  const ta = tokens(a.productName);
  const tb = tokens(b.productName);
  if (ta.length === 0 || tb.length === 0) return false;
  return ta.some((t) => tb.includes(t));
}

// Merge rows from up to 3 providers into a single best-guess set.
// If both LLMs returned nothing, fall back to local OCR rows. Otherwise
// prefer Gemini, dedupe Groq rows that agree by price + name token.
export function mergeProviderRows(
  tesseract: BatchRow[],
  gemini: BatchRow[],
  groq: BatchRow[],
): BatchRow[] {
  if (gemini.length === 0 && groq.length === 0) return tesseract;

  const out: BatchRow[] = [];
  const groqMatched = new Set<number>();

  for (const g of gemini) {
    const idx = groq.findIndex(
      (q, i) => !groqMatched.has(i) && rowsMatch(g, q),
    );
    if (idx >= 0) groqMatched.add(idx);
    out.push(g);
  }
  for (let i = 0; i < groq.length; i++) {
    if (!groqMatched.has(i)) out.push(groq[i]);
  }
  return out;
}
