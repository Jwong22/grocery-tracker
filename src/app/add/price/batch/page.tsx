import { BatchClient } from "./BatchClient";

export default function BatchImportPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">
          Bulk import prices
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Photo OCR, PDF, Excel, or Gemini Smart Parse — all feed into the same
          editable review table before saving.
        </p>
      </header>
      <BatchClient />
    </div>
  );
}
