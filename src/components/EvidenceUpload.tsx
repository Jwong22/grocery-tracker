"use client";

import { useState } from "react";

type Props = {
  name?: string;
  label?: string;
  hint?: string;
  accept?: string;
};

export function EvidenceUpload({
  name = "evidence",
  label = "Photos",
  hint = "Optional. Receipts, price tags, packaging — multiple files allowed.",
  accept = "image/*,application/pdf",
}: Props) {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="space-y-1.5">
      <label className="block">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="block text-xs text-muted-foreground mb-2">{hint}</span>
        <input
          type="file"
          name={name}
          accept={accept}
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80 cursor-pointer"
        />
      </label>
      {files.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5 pt-1">
          {files.map((f, i) => (
            <li key={i}>
              📎 {f.name}{" "}
              <span className="text-muted-foreground/70">
                ({Math.round(f.size / 1024)} KB)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
