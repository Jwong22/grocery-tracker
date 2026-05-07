import { BatchClient } from "./BatchClient";

export default function BatchImportPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bulk import prices
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Photos run through Gemini, Llama Vision, and local OCR in parallel;
          the merged best-match rows land in the editable review table. PDFs
          and Excel feed into the same table.
        </p>
      </header>
      <BatchClient />
    </div>
  );
}
