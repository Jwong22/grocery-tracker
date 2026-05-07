"use client";

// Lazy-loads tesseract.js only when the user actually scans an image.
// Tesseract ships ~3MB of WASM + training data — never load it eagerly.

export async function ocrImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
